import { Schema, model, Document } from "mongoose";

export interface IPayment extends Document {
  order: Schema.Types.ObjectId;
  paymentOrderId: string; // Razorpay Order ID
  paymentId?: string; // Razorpay Payment ID
  signature?: string; // Razorpay Signature
  provider: string; // e.g. "razorpay"
  amount: number;
  currency: string;
  paymentStatus: "Pending" | "Success" | "Failure";
  rawWebhookPayload?: Schema.Types.Mixed;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    paymentOrderId: { type: String, required: true, index: true },
    paymentId: { type: String },
    signature: { type: String },
    provider: { type: String, default: "razorpay" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentStatus: { type: String, enum: ["Pending", "Success", "Failure"], default: "Pending" },
    rawWebhookPayload: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const Payment = model<IPayment>("Payment", PaymentSchema);
