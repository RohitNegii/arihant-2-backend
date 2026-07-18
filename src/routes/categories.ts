import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} from "../controllers/categories";

const router = Router();

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
router.get("/", getCategories);

// @desc    Get category by slug
// @route   GET /api/categories/:slug
// @access  Public
router.get("/:slug", getCategoryBySlug);

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
router.post("/", protect, adminOnly, createCategory);

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
router.put("/:id", protect, adminOnly, updateCategory);

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete("/:id", protect, adminOnly, deleteCategory);

export default router;
