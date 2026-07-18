import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  sendOtp,
  verifyOtp,
  getUsers,
  deleteUser
} from "../controllers/auth";

const router = Router();

// @desc    Send OTP to phone
// @route   POST /api/auth/send-otp
// @access  Public
router.post("/send-otp", sendOtp);

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
router.post("/verify-otp", verifyOtp);

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", register);

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post("/login", login);

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, getMe);

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", forgotPassword);

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
router.post("/reset-password/:token", resetPassword);

// @desc    Change Password
// @route   POST /api/auth/change-password
// @access  Private
router.post("/change-password", protect, changePassword);

// @desc    Get all users except admins
// @route   GET /api/auth/users
// @access  Private/Admin
router.get("/users", protect, adminOnly, getUsers);

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
router.delete("/users/:id", protect, adminOnly, deleteUser);

export default router;
