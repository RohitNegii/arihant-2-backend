import { Schema, model, Document } from "mongoose";

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "New" | "In Progress" | "Resolved";
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["New", "In Progress", "Resolved"],
      default: "New",
      index: true
    },
    isRead: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Compound or single index for date sorting sorting queries
ContactSchema.index({ createdAt: -1 });

export const Contact = model<IContact>("Contact", ContactSchema);
