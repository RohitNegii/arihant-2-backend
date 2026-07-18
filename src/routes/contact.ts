import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import rateLimit from "express-rate-limit";
import {
  createContactInquiry,
  getContactInquiries,
  deleteContactInquiry
} from "../controllers/contact";

const router = Router();

// Anti-spam rate limiting: max 5 submissions per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many contact submissions from this IP, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// @desc    Submit a contact inquiry
// @route   POST /api/contact
// @access  Public (Rate-limited)
router.post("/contact", contactLimiter, createContactInquiry);

// @desc    Admin inquiry management routes
// @access  Private/Admin
router.get("/admin/contact", protect, adminOnly, getContactInquiries);
router.delete("/admin/contact/:id", protect, adminOnly, deleteContactInquiry);

export default router;
