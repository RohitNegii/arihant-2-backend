import { Request, Response, NextFunction } from "express";
import { Order, IOrderItem } from "../models/Order";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { AuthRequest } from "../middlewares/auth";

export const VALID_ORDER_STATUSES = [
  "Pending Confirmation",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Completed",
  "Cancelled"
];

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const orders = await Order.find({ customer: req.user?._id })
      .populate("items.product", "name slug thumbnail images")
      .sort({ createdAt: -1 });
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
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("items.product", "name slug thumbnail images price");
    
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

// @desc    Get all orders list (Admin) with filters and pagination
// @route   GET /api/orders/admin/list
// @access  Private/Admin
export const getAdminOrders = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search, status, page, limit } = req.query;

    const query: any = {};

    // Status filter
    if (status && status !== "ALL" && status !== "") {
      query.orderStatus = status;
    }

    // Search filter across orderNumber, customer or shipping details
    if (search && typeof search === "string" && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");

      // Find matching users first
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      }).select("_id");

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { orderNumber: searchRegex },
        { customer: { $in: userIds } },
        { "shippingAddress.name": searchRegex },
        { "shippingAddress.phone": searchRegex },
        { "shippingAddress.city": searchRegex }
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const totalOrders = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .populate("items.product", "name thumbnail images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.json({
      success: true,
      count: orders.length,
      total: totalOrders,
      page: pageNum,
      totalPages: Math.ceil(totalOrders / limitNum) || 1,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status manually (Admin)
// @route   PUT /api/orders/admin/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { status, comment } = req.body;
    const orderId = req.params.id;

    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed: ${VALID_ORDER_STATUSES.join(", ")}`
      });
    }

    const order = await Order.findById(orderId).populate("customer", "name email phone");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const oldStatus = order.orderStatus;
    const adminName = req.user?.name || "Admin";

    // Deduct stock if moving to Confirmed, Processing, Shipped, Delivered, or Completed
    const activeConfirmedStatuses = ["Confirmed", "Processing", "Shipped", "Delivered", "Completed"];
    if (activeConfirmedStatuses.includes(status) && !order.stockDeducted) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const selectedVariantName = item.variant;
          if (product.hasVariants && selectedVariantName) {
            const variant = product.variants?.find(
              (v: any) => v.name.toLowerCase() === selectedVariantName.toLowerCase()
            );
            if (variant) {
              variant.stock = Math.max(0, variant.stock - item.quantity);
              product.markModified("variants");
            }
          } else {
            product.stock = Math.max(0, (product.stock || 0) - item.quantity);
          }
          await product.save();
        }
      }
      order.stockDeducted = true;
    }

    // Restore stock if moving to Cancelled after having deducted stock
    if (status === "Cancelled" && order.stockDeducted) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const selectedVariantName = item.variant;
          if (product.hasVariants && selectedVariantName) {
            const variant = product.variants?.find(
              (v: any) => v.name.toLowerCase() === selectedVariantName.toLowerCase()
            );
            if (variant) {
              variant.stock += item.quantity;
              product.markModified("variants");
            }
          } else {
            product.stock = (product.stock || 0) + item.quantity;
          }
          await product.save();
        }
      }
      order.stockDeducted = false;
    }

    // Update paymentStatus if order is marked Completed or Confirmed
    if (status === "Completed") {
      order.paymentStatus = "Paid";
    }

    order.orderStatus = status;

    const timelineComment = comment && typeof comment === "string" && comment.trim() !== ""
      ? comment.trim()
      : `Order status manually updated from '${oldStatus}' to '${status}' by ${adminName}.`;

    order.statusTimeline.push({
      status,
      date: new Date(),
      comment: timelineComment,
      updatedBy: adminName
    });

    await order.save();

    return res.json({
      success: true,
      message: `Order status updated to '${status}'`,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update manual tracking details
// @route   PUT /api/orders/admin/:id/shipping
// @access  Private/Admin
export const updateShipping = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { trackingNumber, courierName, expectedDelivery, shipmentStatus, trackingUrl } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (trackingUrl !== undefined) {
      let formattedUrl = trackingUrl.trim();
      if (formattedUrl !== "") {
        if (!formattedUrl.match(/^(https?:\/\/)/i)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        try {
          const parsed = new URL(formattedUrl);
          if (!parsed.hostname.includes(".")) {
            throw new Error("Invalid domain name");
          }
        } catch (_) {
          return res.status(400).json({ success: false, message: "Invalid Tracking URL format" });
        }
      }
      order.trackingUrl = formattedUrl;
    }

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (courierName !== undefined) order.courierName = courierName;
    if (shipmentStatus !== undefined) order.shipmentStatus = shipmentStatus;
    if (expectedDelivery !== undefined) order.expectedDelivery = expectedDelivery ? new Date(expectedDelivery) : undefined;

    let logComment = "Shipment details updated.";
    if (trackingUrl !== undefined) {
      logComment += ` Tracking URL: ${trackingUrl || "Cleared"}.`;
    } else {
      logComment += ` Courier: ${courierName || order.courierName || "N/A"}, Tracking: ${trackingNumber || order.trackingNumber || "N/A"}.`;
    }

    order.statusTimeline.push({
      status: "Shipping Update",
      date: new Date(),
      comment: logComment,
      updatedBy: req.user?.name || "Admin"
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
    const confirmedOrders = await Order.find({
      orderStatus: { $in: ["Confirmed", "Processing", "Shipped", "Delivered", "Completed"] }
    });
    const revenue = confirmedOrders.reduce((sum, order) => sum + order.grandTotal, 0);

    const totalCustomers = await User.countDocuments({ role: "customer" });
    const totalProducts = await Product.countDocuments({ isDeleted: false });

    // Recent orders
    const recentOrders = await Order.find()
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 })
      .limit(5);

    // Low stock products
    const lowStockProducts = await Product.find({ isDeleted: false, stock: { $lt: 5 } })
      .populate("category", "name")
      .sort({ stock: 1 });

    // Top selling products aggregation
    const topProducts = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: ["Confirmed", "Processing", "Shipped", "Delivered", "Completed"] }
        }
      },
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
          orderStatus: { $in: ["Confirmed", "Processing", "Shipped", "Delivered", "Completed"] },
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

    // Format monthly data for chart consumption
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
