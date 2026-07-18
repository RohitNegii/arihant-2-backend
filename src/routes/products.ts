import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import { upload } from "../middlewares/upload";
import {
  getProducts,
  getAdminProducts,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  uploadProductImages,
  updateProduct,
  deleteProduct,
  addProductReview,
  checkCanReview
} from "../controllers/products";

const router = Router();

// @desc    Get public catalog products with sorting, filtering, searching and pagination
// @route   GET /api/products
// @access  Public
router.get("/", getProducts);

// @desc    Get admin products list (includes Draft/Deleted statuses)
// @route   GET /api/products/admin
// @access  Private/Admin
router.get("/admin", protect, adminOnly, getAdminProducts);

// @desc    Get product by slug
// @route   GET /api/products/:slug
// @access  Public
router.get("/:slug", getProductBySlug);

// @desc    Get related products
// @route   GET /api/products/related/:id
// @access  Public
router.get("/related/:id", getRelatedProducts);

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
router.post("/", protect, adminOnly, createProduct);

// @desc    Upload product images (Admin)
// @route   POST /api/products/upload-images
// @access  Private/Admin
router.post(
  "/upload-images",
  protect,
  adminOnly,
  upload.array("images", 10),
  uploadProductImages
);

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put("/:id", protect, adminOnly, updateProduct);

// @desc    Soft Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete("/:id", protect, adminOnly, deleteProduct);

// @desc    Add review to product
// @route   POST /api/products/:id/reviews
// @access  Private
router.post("/:id/reviews", protect, addProductReview);

// @desc    Check if user can review product
// @route   GET /api/products/:id/can-review
// @access  Private
router.get("/:id/can-review", protect, checkCanReview);

export default router;
