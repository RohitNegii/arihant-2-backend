import { Request, Response, NextFunction } from "express";
import { Order, IOrderItem } from "../models/Order";
import { Payment } from "../models/Payment";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { Cart } from "../models/Cart";
import { AuthRequest } from "../middlewares/auth";
import { notificationService } from "../services/notification";

// Helper to generate unique order numbers
const generateOrderNumber = () => {
  return `AUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const orders = await Order.find({ customer: req.user?._id }).sort({ createdAt: -1 });
    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details
// @route   GET /api/orders/:id
// @access  Private
export const getOrderDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const order = await Order.findById(req.params.id).populate("customer", "name email phone");
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Verify ownership
    if (req.user?.role !== "admin" && (order.customer as any)._id.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to view this order" });
    }

    return res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders list (Admin)
// @route   GET /api/orders/admin/list
// @access  Private/Admin
export const getAdminOrders = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const query: any = {};
    if (req.query.status) {
      query.orderStatus = req.query.status;
    }

    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order timeline status
// @route   PUT /api/orders/admin/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { status, comment } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.orderStatus = status;
    order.statusTimeline.push({
      status,
      date: new Date(),
      comment: comment || `Status updated to ${status}`
    });

    await order.save();
    return res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update manual tracking details
// @route   PUT /api/orders/admin/:id/shipping
// @access  Private/Admin
export const updateShipping = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { trackingNumber, courierName, expectedDelivery, shipmentStatus, trackingUrl } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (trackingUrl !== undefined) {
      if (trackingUrl !== "") {
        try {
          new URL(trackingUrl);
        } catch (_) {
          return res.status(400).json({ success: false, message: "Invalid Tracking URL format" });
        }
      }
      order.trackingUrl = trackingUrl;
    }

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (courierName !== undefined) order.courierName = courierName;
    if (shipmentStatus !== undefined) order.shipmentStatus = shipmentStatus;
    if (expectedDelivery !== undefined) order.expectedDelivery = expectedDelivery ? new Date(expectedDelivery) : undefined;

    let logComment = "Shipment logs updated.";
    if (trackingUrl !== undefined) {
      logComment += ` Tracking URL: ${trackingUrl || "Cleared"}.`;
    } else {
      logComment += ` Courier: ${courierName || order.courierName || "N/A"}, Tracking: ${trackingNumber || order.trackingNumber || "N/A"}.`;
    }

    order.statusTimeline.push({
      status: order.orderStatus,
      date: new Date(),
      comment: logComment
    });

    await order.save();
    return res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics & sales timeline data
// @route   GET /api/orders/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Total numbers
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.find({ paymentStatus: "Paid" });
    const revenue = paidOrders.reduce((sum, order) => sum + order.grandTotal, 0);

    const totalCustomers = await User.countDocuments({ role: "customer" });
    const totalProducts = await Product.countDocuments({ isDeleted: false });

    // Recent orders
    const recentOrders = await Order.find()
      .populate("customer", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    // Low stock products
    const lowStockProducts = await Product.find({ isDeleted: false, stock: { $lt: 5 } })
      .populate("category", "name")
      .sort({ stock: 1 });

    // Top selling products aggregation
    const topProducts = await Order.aggregate([
      { $match: { paymentStatus: "Paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          quantitySold: { $sum: "$items.quantity" },
          revenueGenerated: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 }
    ]);

    // Monthly sales dataset for chart
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const monthlySales = await Order.aggregate([
      {
        $match: {
          paymentStatus: "Paid",
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalSales: { $sum: "$grandTotal" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Format monthly data for chart consumption (e.g. [{ month: "Jan", sales: 12000, orders: 4 }])
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const salesChartData = monthlySales.map((item) => {
      const monthLabel = monthNames[item._id.month - 1];
      return {
        month: `${monthLabel} ${item._id.year}`,
        sales: item.totalSales,
        orders: item.orderCount
      };
    });

    return res.json({
      success: true,
      stats: {
        revenue,
        totalOrders,
        totalCustomers,
        totalProducts
      },
      recentOrders,
      lowStockProducts,
      topProducts,
      salesChartData
    });
  } catch (error) {
    next(error);
  }
};
