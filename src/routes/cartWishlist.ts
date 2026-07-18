import { Router } from "express";
import { protect } from "../middlewares/auth";
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart
} from "../controllers/cartWishlist";

const router = Router();

// ==========================================
// CART ENDPOINTS
// ==========================================

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
router.get("/cart", protect, getCart);

// @desc    Add item or update quantity in cart
// @route   POST /api/cart
// @access  Private
router.post("/cart", protect, addToCart);

// @desc    Update item quantity directly (set exact quantity)
// @route   PUT /api/cart/quantity
// @access  Private
router.put("/cart/quantity", protect, updateCartQuantity);

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
router.delete("/cart/:productId", protect, removeFromCart);

export default router;
