import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import {
  login,
  getMe,
  changePassword,
  sendOtp,
  verifyOtp,
  getUsers,
  toggleBlockUser
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

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post("/login", login);

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, getMe);

// @desc    Change Password
// @route   POST /api/auth/change-password
// @access  Private
router.post("/change-password", protect, changePassword);

// @desc    Get all users except admins
// @route   GET /api/auth/users
// @access  Private/Admin
router.get("/users", protect, adminOnly, getUsers);

// @desc    Toggle block status of a user
// @route   PUT /api/auth/users/:id/toggle-block
// @access  Private/Admin
router.put("/users/:id/toggle-block", protect, adminOnly, toggleBlockUser);

export default router;
