import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth";
import { Cart } from "../models/Cart";
import { Product } from "../models/Product";
import { Order, IOrderItem } from "../models/Order";
import { Payment } from "../models/Payment";
import { User } from "../models/User";
import { encrypt, decrypt } from "../services/ccavenue";
import { notificationService } from "../services/notification";

// Helper to generate unique order numbers
const generateOrderNumber = () => {
  return `AUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

/**
 * @desc    Create a new order & initiate Razorpay payment using Cart data
 * @route   POST /api/checkout/create-order
 * @access  Private
 */
export const createCheckoutOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { shippingAddress, billingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: "Shipping address is required" });
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
        return res.status(404).json({ success: false, message: `Product is no longer available` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}. Only ${product.stock} units available.`
        });
      }

      const price = product.price;
      subtotal += price * item.quantity;

      verifiedItems.push({
        product: product._id,
        name: product.name,
        price: price,
        quantity: item.quantity,
        image: product.thumbnail || product.images[0] || "",
        size: item.size
      });
    }

    // Calculate tax (3% GST standard for jewelry) and shipping (₹250 flat, free above ₹15,000)
    const discountAmount = 0; // Placeholder for coupon features
    const taxAmount = Math.round(subtotal * 0.03);
    const shippingAmount = subtotal > 15000 ? 0 : 250;
    const grandTotal = subtotal - discountAmount + taxAmount + shippingAmount;

    const orderNumber = generateOrderNumber();

    // Save Order in database under Pending status
    const order = await Order.create({
      orderNumber,
      customer: req.user?._id,
      items: verifiedItems,
      shippingAddress,
      billingAddress: billAddress,
      subtotal,
      discountAmount,
      taxAmount,
      shippingAmount,
      grandTotal,
      paymentStatus: "Pending",
      orderStatus: "Pending",
      razorpayOrderId: orderNumber,
      statusTimeline: [
        {
          status: "Pending",
          date: new Date(),
          comment: "Order checkout initiated. Awaiting payment completion."
        }
      ]
    });

    // Create Payment log
    await Payment.create({
      order: order._id,
      paymentOrderId: orderNumber,
      provider: "ccavenue",
      amount: grandTotal,
      currency: "INR",
      paymentStatus: "Pending"
    });

    // Prepare CCAvenue parameters
    const merchantId = process.env.CCAVENUE_MERCHANT_ID || "";
    const accessCode = process.env.CCAVENUE_ACCESS_CODE || "";
    const workingKey = process.env.CCAVENUE_WORKING_KEY || "";
    const gatewayUrl = process.env.CCAVENUE_GATEWAY_URL || "";
    const redirectUrl = process.env.CCAVENUE_REDIRECT_URL || "";

    const billingName = shippingAddress.name || "";
    const billingAddrStr = `${shippingAddress.addressLine1} ${shippingAddress.addressLine2 || ""}`.trim();
    const billingCity = shippingAddress.city || "";
    const billingState = shippingAddress.state || "";
    const billingZip = shippingAddress.postalCode || "";
    const billingCountry = shippingAddress.country || "India";
    const billingTel = shippingAddress.phone || "";
    const billingEmail = req.user?.email || "";

    const ccavenueParams = [
      `merchant_id=${merchantId}`,
      `order_id=${orderNumber}`,
      `amount=${grandTotal}`,
      `currency=INR`,
      `redirect_url=${encodeURIComponent(redirectUrl)}`,
      `cancel_url=${encodeURIComponent(redirectUrl)}`,
      `language=EN`,
      `billing_name=${encodeURIComponent(billingName)}`,
      `billing_address=${encodeURIComponent(billingAddrStr)}`,
      `billing_city=${encodeURIComponent(billingCity)}`,
      `billing_state=${encodeURIComponent(billingState)}`,
      `billing_zip=${encodeURIComponent(billingZip)}`,
      `billing_country=${encodeURIComponent(billingCountry)}`,
      `billing_tel=${encodeURIComponent(billingTel)}`,
      `billing_email=${encodeURIComponent(billingEmail)}`,
      `delivery_name=${encodeURIComponent(billingName)}`,
      `delivery_address=${encodeURIComponent(billingAddrStr)}`,
      `delivery_city=${encodeURIComponent(billingCity)}`,
      `delivery_state=${encodeURIComponent(billingState)}`,
      `delivery_zip=${encodeURIComponent(billingZip)}`,
      `delivery_country=${encodeURIComponent(billingCountry)}`,
      `delivery_tel=${encodeURIComponent(billingTel)}`
    ].join("&");

    const encRequest = encrypt(ccavenueParams, workingKey);

    return res.status(201).json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        grandTotal: order.grandTotal,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        shippingAmount: order.shippingAmount
      },
      ccavenueData: {
        encRequest,
        accessCode,
        paymentUrl: gatewayUrl
      }
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Handle CCAvenue POST response callback (Redirect mode)
 * @route   POST /api/checkout/ccavenue-response
 * @access  Public
 */
export const handleCCAvenueResponse = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { encResp } = req.body;
    if (!encResp) {
      console.error("[CCAvenue Error] Missing encResp in response POST request.");
      return res.status(400).send("Bad request: Missing response token.");
    }

    const workingKey = process.env.CCAVENUE_WORKING_KEY || "";
    const decryptedResp = decrypt(encResp, workingKey);

    // Parse the decrypted response (e.g. order_id=AUR-xxx&order_status=Success...)
    const params = new URLSearchParams(decryptedResp);
    const orderNumber = params.get("order_id") || "";
    const orderStatus = params.get("order_status") || "";
    const trackingId = params.get("tracking_id") || "";
    const bankRefNo = params.get("bank_ref_no") || "";
    const failureMessage = params.get("failure_message") || "";

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    console.log(`[CCAvenue Callback] Received order: ${orderNumber}, status: ${orderStatus}`);

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      console.warn(`[CCAvenue Error] Order not found for reference: ${orderNumber}`);
      return res.redirect(`${frontendUrl}/checkout?error=Order+not+found`);
    }

    const paymentLog = await Payment.findOne({ order: order._id });
    if (!paymentLog) {
      console.warn(`[CCAvenue Error] Payment log not found for order: ${order._id}`);
      return res.redirect(`${frontendUrl}/checkout?error=Payment+log+not+found`);
    }

    if (orderStatus === "Success") {
      if (order.paymentStatus !== "Paid") {
        // Update payment log
        paymentLog.paymentStatus = "Success";
        paymentLog.paymentId = trackingId;
        paymentLog.signature = bankRefNo;
        paymentLog.rawWebhookPayload = Object.fromEntries(params) as any;
        await paymentLog.save();

        // Update Order details
        order.paymentStatus = "Paid";
        order.orderStatus = "Confirmed";
        order.razorpayOrderId = orderNumber;
        order.razorpayPaymentId = trackingId;
        order.razorpaySignature = bankRefNo;
        order.statusTimeline.push({
          status: "Confirmed",
          date: new Date(),
          comment: "Payment verified successfully via CCAvenue. Order confirmed."
        });
        await order.save();

        // Deduct stock from products
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        }

        // Empty User's Cart
        await Cart.findOneAndUpdate({ customer: order.customer }, { $set: { items: [] } });

        // Send WhatsApp confirmation
        const user = await User.findById(order.customer);
        if (user && user.phone) {
          try {
            await notificationService.sendWhatsAppConfirmation(user.phone, order.orderNumber, order.grandTotal);
          } catch (err) {
            // Ignored
          }
        }
      }

      return res.redirect(`${frontendUrl}/order-success?orderId=${order._id}`);
    } else {
      // payment failed or was aborted
      paymentLog.paymentStatus = "Failure";
      paymentLog.rawWebhookPayload = Object.fromEntries(params) as any;
      await paymentLog.save();

      order.paymentStatus = "Failed";
      order.orderStatus = "Cancelled";
      order.statusTimeline.push({
        status: "Cancelled",
        date: new Date(),
        comment: `Payment failed or aborted on CCAvenue. Message: ${failureMessage || orderStatus}`
      });
      await order.save();

      const encodedErrMsg = encodeURIComponent(failureMessage || `Payment failed with status ${orderStatus}`);
      return res.redirect(`${frontendUrl}/checkout?error=${encodedErrMsg}`);
    }
  } catch (error) {
    console.error("CCAvenue Callback Handler Error:", error);
    next(error);
  }
};

