import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import {
  getDiscountSettings,
  updateDiscountSettings,
  getWhatsAppSettings,
  updateWhatsAppSettings
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

// @desc    Get WhatsApp business configuration
// @route   GET /api/settings/whatsapp
// @access  Public
router.get("/whatsapp", getWhatsAppSettings);

// @desc    Update WhatsApp business configuration (Admin)
// @route   PUT /api/settings/whatsapp
// @access  Private/Admin
router.put("/whatsapp", protect, adminOnly, updateWhatsAppSettings);

export default router;

