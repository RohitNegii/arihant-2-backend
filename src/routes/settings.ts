import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import {
  getDiscountSettings,
  updateDiscountSettings
} from "../controllers/settings";

const router = Router();

// @desc    Get global discount settings
// @route   GET /api/settings/discount
// @access  Public
router.get("/discount", getDiscountSettings);

// @desc    Update global discount settings (Admin)
// @route   PUT /api/settings/discount
// @access  Private/Admin
router.put("/discount", protect, adminOnly, updateDiscountSettings);

export default router;
