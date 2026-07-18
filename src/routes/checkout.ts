import { Router } from "express";
import { protect } from "../middlewares/auth";
import {
  createCheckoutOrder,
  handleCCAvenueResponse
} from "../controllers/checkout";

const router = Router();

// @desc    Initiate Checkout (Create CCAvenue payload & Pending MERN Order)
// @route   POST /api/checkout/create-order
// @access  Private
router.post("/create-order", protect, createCheckoutOrder);

// @desc    CCAvenue Response Callback Endpoint (Secure decryption & validation)
// @route   POST /api/checkout/ccavenue-response
// @access  Public
router.post("/ccavenue-response", handleCCAvenueResponse);

export default router;
