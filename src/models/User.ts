import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email?: string;
  password?: string;
  phone: string;
  role: "customer" | "admin";
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  otpCode?: string;
  otpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, index: true, lowercase: true, trim: true, sparse: true },
    password: { type: String },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    otpCode: { type: String },
    otpExpires: { type: Date }
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
