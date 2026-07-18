import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from "../controllers/faqs";

const router = Router();

// @desc    Get all FAQs
// @route   GET /api/faqs
// @access  Public
router.get("/", getFAQs);

// @desc    Create FAQ
// @route   POST /api/faqs
// @access  Private/Admin
router.post("/", protect, adminOnly, createFAQ);

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private/Admin
router.put("/:id", protect, adminOnly, updateFAQ);

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private/Admin
router.delete("/:id", protect, adminOnly, deleteFAQ);

export default router;
