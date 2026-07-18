import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aurum-jewelry";
    await mongoose.connect(connStr);
    console.log("MongoDB Connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};
