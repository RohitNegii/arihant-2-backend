import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth";
import { Cart } from "../models/Cart";
import { Order, IOrderItem } from "../models/Order";
import { getBusinessWhatsAppNumber } from "./settings";

// Helper to generate unique order numbers
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timestamp}-${random}`;
};

/**
 * @desc    Create a new WhatsApp-based order using Cart data
 * @route   POST /api/checkout/create-order
 * @access  Private
 */
export const createCheckoutOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { shippingAddress, billingAddress, email, secondaryEmail } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: "Shipping address is required" });
    }

    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required delivery details (Name, Phone, Address, City, State, PIN Code)."
      });
    }

    const billAddress = billingAddress || shippingAddress;

    // Fetch user's cart from the database
    const cart = await Cart.findOne({ customer: req.user?._id }).populate({
      path: "items.product",
      model: "Product"
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Your shopping bag is empty" });
    }

    // Verify products and calculate subtotal
    let subtotal = 0;
    const verifiedItems: IOrderItem[] = [];

    for (const item of cart.items) {
      const product: any = item.product;
      if (!product || product.isDeleted || product.status !== "Published") {
        return res.status(404).json({ success: false, message: "A product in your cart is no longer available" });
      }

      let price = product.price;
      let stock = product.stock;
      const selectedVariantName = item.variant;

      if (product.hasVariants && selectedVariantName) {
        const variant = product.variants?.find(
          (v: any) => v.name.toLowerCase() === selectedVariantName.toLowerCase()
        );
        if (variant) {
          price = variant.price;
          stock = variant.stock;
        } else {
          return res.status(400).json({
            success: false,
            message: `Selected variant '${selectedVariantName}' is invalid for product: ${product.name}`
          });
        }
      } else if (product.hasVariants && !selectedVariantName) {
        return res.status(400).json({
          success: false,
          message: `Variant selection is required for product: ${product.name}`
        });
      }

      if (stock === undefined || stock === null || stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}${selectedVariantName ? ` (${selectedVariantName})` : ""}. Only ${stock ?? 0} units available.`
        });
      }

      const itemPrice = price || 0;
      subtotal += itemPrice * item.quantity;

      let itemDisplayName = product.name;
      if (selectedVariantName) {
        itemDisplayName += ` (${selectedVariantName})`;
      }
      if (item.size) {
        itemDisplayName += ` [Size: ${item.size}]`;
      }

      verifiedItems.push({
        product: product._id,
        name: itemDisplayName,
        price: itemPrice,
        quantity: item.quantity,
        image: product.thumbnail || product.images?.[0] || "",
        size: item.size,
        variant: selectedVariantName || undefined
      });
    }

    const discountAmount = 0;
    const taxAmount = 0;
    const shippingAmount = 0;
    const grandTotal = subtotal + taxAmount + shippingAmount;

    const orderNumber = generateOrderNumber();

    // Build human-readable formatted address
    const addressParts = [
      shippingAddress.addressLine1,
      shippingAddress.addressLine2,
      shippingAddress.city,
      shippingAddress.state,
      shippingAddress.postalCode ? `PIN: ${shippingAddress.postalCode}` : "",
      shippingAddress.country || "India"
    ].filter(Boolean);
    const formattedAddress = addressParts.join(", ");

    // Build WhatsApp formatted product list
    const productLines = verifiedItems.map((item) => {
      const itemPriceTotal = (item.price * item.quantity).toLocaleString("en-IN");
      return `- ${item.name} — Quantity: ${item.quantity} — Price: ₹${itemPriceTotal}`;
    }).join("\n");

    const customerName = shippingAddress.name || req.user?.name || "Valued Patron";
    const customerPhone = shippingAddress.phone || req.user?.phone || "";

    // Pre-filled WhatsApp message matching required template
    const prefilledMessage = `Hello, I would like to confirm my order.

Order ID: ${orderNumber}

Products:
${productLines}

Total Amount: ₹${grandTotal.toLocaleString("en-IN")}

Customer Name: ${customerName}
Phone: ${customerPhone}
Delivery Address: ${formattedAddress}

Please confirm my order. Thank you!`;

    // Retrieve configured business WhatsApp number
    const businessWhatsAppNumber = await getBusinessWhatsAppNumber();
    const whatsappUrl = `https://wa.me/${businessWhatsAppNumber}?text=${encodeURIComponent(prefilledMessage)}`;

    // Create Order in database under "Pending Confirmation" status
    const order = await Order.create({
      orderNumber,
      customer: req.user?._id,
      email: email || req.user?.email || "",
      items: verifiedItems,
      shippingAddress,
      billingAddress: billAddress,
      secondaryEmail: secondaryEmail || "",
      subtotal,
      discountAmount,
      taxAmount,
      shippingAmount,
      grandTotal,
      paymentStatus: "Pending",
      orderStatus: "Pending Confirmation",
      whatsappMessage: prefilledMessage,
      whatsappUrl,
      statusTimeline: [
        {
          status: "Pending Confirmation",
          date: new Date(),
          comment: "Order registered via WhatsApp Checkout. Awaiting manual confirmation via WhatsApp."
        }
      ]
    });

    // Empty User's Shopping Bag in database
    await Cart.findOneAndUpdate({ customer: req.user?._id }, { $set: { items: [] } });

    return res.status(201).json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        grandTotal: order.grandTotal,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        orderStatus: order.orderStatus,
        items: order.items,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt
      },
      whatsappNumber: businessWhatsAppNumber,
      whatsappUrl,
      messageText: prefilledMessage
    });
  } catch (error) {
    next(error);
  }
};
