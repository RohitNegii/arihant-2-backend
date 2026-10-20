import dotenv from "dotenv";
// Load env vars first
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/errors";

// Import Routes
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import cartWishlistRoutes from "./routes/cartWishlist";
import orderRoutes from "./routes/orders";
import checkoutRoutes from "./routes/checkout";
import contactRoutes from "./routes/contact";
import faqRoutes from "./routes/faqs";
import settingRoutes from "./routes/settings";
import homeMediaRoutes from "./routes/homeMedia";

const app = express();

// Trust proxy for rate limiting behind ngrok, render, or other reverse proxies
app.set("trust proxy", 1);

// Connect to Database
connectDB();

// Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    return callback(new Error("Blocked by CORS policy"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Rate Limiting (100 requests per 5 minutes per IP)
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 5 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", limiter);

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api", cartWishlistRoutes); // mounts /api/cart and /api/wishlist
app.use("/api/orders", orderRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api", contactRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/home-media", homeMediaRoutes);

// Root route check
app.get("/health", (req, res) => {
  res.json({ success: true, status: "healthy", timestamp: new Date() });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});
