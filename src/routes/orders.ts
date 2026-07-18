import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import {
  getMyOrders,
  getOrderDetails,
  getAdminOrders,
  updateOrderStatus,
  updateShipping,
  getAdminStats
} from "../controllers/orders";

const router = Router();

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
router.get("/my-orders", protect, getMyOrders);

// @desc    Get order details
// @route   GET /api/orders/:id
// @access  Private
router.get("/:id", protect, getOrderDetails);

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================

// @desc    Get all orders list (Admin)
// @route   GET /api/orders/admin/list
// @access  Private/Admin
router.get("/admin/list", protect, adminOnly, getAdminOrders);

// @desc    Update order timeline status
// @route   PUT /api/orders/admin/:id/status
// @access  Private/Admin
router.put("/admin/:id/status", protect, adminOnly, updateOrderStatus);

// @desc    Update manual tracking details
// @route   PUT /api/orders/admin/:id/shipping
// @access  Private/Admin
router.put("/admin/:id/shipping", protect, adminOnly, updateShipping);

// @desc    Get dashboard metrics & sales timeline data
// @route   GET /api/orders/admin/stats
// @access  Private/Admin
router.get("/admin/stats", protect, adminOnly, getAdminStats);

export default router;
