import { Schema, model, Document } from "mongoose";

export interface IOrderItem {
  product: Schema.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  variant?: string;
}

export interface IAddressDetails {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface IStatusTimeline {
  status: string;
  date: Date;
  comment?: string;
  updatedBy?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: Schema.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IAddressDetails;
  billingAddress: IAddressDetails;
  email?: string;
  secondaryEmail?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
  paymentStatus: "Pending" | "Paid" | "Failed";
  orderStatus:
    | "Pending Confirmation"
    | "Confirmed"
    | "Processing"
    | "Shipped"
    | "Delivered"
    | "Completed"
    | "Cancelled"
    | string;
  trackingNumber?: string;
  courierName?: string;
  shipmentStatus?: string;
  whatsappMessage?: string;
  whatsappUrl?: string;
  statusTimeline: IStatusTimeline[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  stockDeducted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
  size: { type: String },
  variant: { type: String }
});

const AddressDetailsSchema = new Schema<IAddressDetails>({
  name: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, default: "" },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, required: true }
});

const StatusTimelineSchema = new Schema<IStatusTimeline>({
  status: { type: String, required: true },
  date: { type: Date, default: Date.now },
  comment: { type: String, default: "" },
  updatedBy: { type: String, default: "" }
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: { type: AddressDetailsSchema, required: true },
    billingAddress: { type: AddressDetailsSchema, required: true },
    email: { type: String, default: "" },
    secondaryEmail: { type: String, default: "" },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    shippingAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
    orderStatus: {
      type: String,
      enum: [
        "Pending Confirmation",
        "Confirmed",
        "Processing",
        "Shipped",
        "Delivered",
        "Completed",
        "Cancelled",
        "Pending",
        "Packed",
        "Refunded"
      ],
      default: "Pending Confirmation"
    },
    trackingNumber: { type: String },
    courierName: { type: String },
    shipmentStatus: { type: String },
    whatsappMessage: { type: String, default: "" },
    whatsappUrl: { type: String, default: "" },
    stockDeducted: { type: Boolean, default: false },
    statusTimeline: { type: [StatusTimelineSchema], default: [] },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String }
  },
  { timestamps: true }
);

export const Order = model<IOrder>("Order", OrderSchema);
