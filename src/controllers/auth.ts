import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Cart } from "../models/Cart";
import { AuthRequest } from "../middlewares/auth";

const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || "your_jwt_secret_key_here_for_development";
  return jwt.sign({ id }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: "Please enter all fields" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "customer"
    });

    // Lazily create cart for user
    await Cart.create({ customer: user._id, items: [] });

    const token = generateToken(user._id.toString());

    return res.status(201).json({
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
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with that email" });
    }

    // Generate token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "your_jwt_secret_key_here_for_development",
      { expiresIn: "10m" }
    );

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Since we don't have a mail server fully integrated, we return the token in the response for development/testing
    return res.json({
      success: true,
      message: "Reset token generated. For testing/dev use the resetToken below.",
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({ success: false, message: "Please provide a new password" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: "Password reset successful. You can now log in." });
  } catch (error) {
    next(error);
  }
};

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

// @desc    Send OTP to phone
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { phone, type } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Please enter your phone number" });
    }

    let user = await User.findOne({ phone });

    if (type === "login") {
      if (!user || !user.isVerified) {
        return res.status(404).json({ success: false, message: "No account registered with this phone number. Please Sign Up." });
      }
    } else if (type === "signup") {
      if (user && user.isVerified) {
        return res.status(400).json({ success: false, message: "An account is already registered with this phone. Please Sign In." });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (!user) {
      // Create guest user draft
      user = await User.create({
        name: "Guest",
        phone,
        role: "customer",
        isVerified: false
      });
    }

    user.otpCode = code;
    user.otpExpires = expires;
    await user.save();

    // Log the OTP code to console
    console.log(`\n======================================\n[VERDANT AUTH OTP] (${type?.toUpperCase()}) Code for ${phone}: ${code}\n======================================\n`);

    return res.json({
      success: true,
      message: "OTP dispatched to console successfully"
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
    const { phone, otp, name, email } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone number and OTP code are required" });
    }

    const user = await User.findOne({
      phone,
      otpCode: otp,
      otpExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP code" });
    }

    // Clear OTP fields & set verified
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;

    // Update name/email if provided
    if (name) user.name = name;
    if (email) user.email = email;

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

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

