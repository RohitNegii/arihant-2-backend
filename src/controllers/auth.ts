import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Cart } from "../models/Cart";
import { AuthRequest } from "../middlewares/auth";
import { emailService } from "../services/email";

const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || "your_jwt_secret_key_here_for_development";
  return jwt.sign({ id }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user._id.toString());

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    return res.json({
      success: true,
      user: {
        id: req.user?._id,
        name: req.user?.name,
        email: req.user?.email,
        phone: req.user?.phone,
        role: req.user?.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @desc    Change Password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please enter current and new passwords" });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password || "");
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Please enter your email address" });
    }

    let user = await User.findOne({ email });

    if (user && user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked. Please contact support." });
    }

    if (type === "login") {
      if (!user || !user.isVerified) {
        return res.status(404).json({ success: false, message: "No account registered with this email address. Please Sign Up." });
      }
    } else if (type === "signup") {
      if (user && user.isVerified) {
        return res.status(400).json({ success: false, message: "An account is already registered with this email. Please Sign In." });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (!user) {
      // Create guest user draft
      user = await User.create({
        name: "Guest",
        email,
        role: "customer",
        isVerified: false
      });
    }

    user.otpCode = code;
    user.otpExpires = expires;
    await user.save();

    // Send the OTP via email
    await emailService.sendOTP(email, code, type || "verification");

    return res.json({
      success: true,
      message: "OTP dispatched successfully",
      code
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and authenticate
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, otp, name, phone } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email address and OTP code are required" });
    }

    const user = await User.findOne({
      email,
      otpCode: otp,
      otpExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP code" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked. Please contact support." });
    }

    // Clear OTP fields & set verified
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;

    // Update name/phone if provided
    if (name) user.name = name;
    if (phone) user.phone = phone || undefined;

    await user.save();

    // Lazily create cart for user if missing
    const cartExists = await Cart.findOne({ customer: user._id });
    if (!cartExists) {
      await Cart.create({ customer: user._id, items: [] });
    }

    const token = generateToken(user._id.toString());

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users except admins
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user block status
// @route   PUT /api/auth/users/:id/toggle-block
// @access  Private/Admin
export const toggleBlockUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Toggle the blocked state
    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.json({
      success: true,
      message: `User account has been ${user.isBlocked ? "blocked" : "unblocked"} successfully.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    next(error);
  }
};

