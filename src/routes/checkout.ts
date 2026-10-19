import { Router } from "express";
import { protect } from "../middlewares/auth";
import { createCheckoutOrder } from "../controllers/checkout";

const router = Router();

// @desc    Initiate WhatsApp Checkout (Creates Pending Confirmation Order & Pre-filled WhatsApp link)
// @route   POST /api/checkout/create-order
// @access  Private
router.post("/create-order", protect, createCheckoutOrder);

export default router;
