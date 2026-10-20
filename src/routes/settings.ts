import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import {
  getWhatsAppSettings,
  updateWhatsAppSettings
} from "../controllers/settings";

const router = Router();

// @desc    Get WhatsApp business configuration
// @route   GET /api/settings/whatsapp
// @access  Public
router.get("/whatsapp", getWhatsAppSettings);

// @desc    Update WhatsApp business configuration (Admin)
// @route   PUT /api/settings/whatsapp
// @access  Private/Admin
router.put("/whatsapp", protect, adminOnly, updateWhatsAppSettings);

export default router;

