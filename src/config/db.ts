import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aurum-jewelry";
    await mongoose.connect(connStr);
    console.log("MongoDB Connected successfully");

    // Drop unique index on phone if it exists
    try {
      await mongoose.connection.collection("users").dropIndex("phone_1");
      console.log("Dropped unique phone index successfully");
    } catch (indexError: any) {
      if (indexError.codeName !== "IndexNotFound" && indexError.code !== 27) {
        console.warn("Notice: Could not drop unique phone index:", indexError.message);
      }
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};
