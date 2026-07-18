import { Schema, model, Document } from "mongoose";

export interface ICartItem {
  product: Schema.Types.ObjectId;
  quantity: number;
  size?: string;
}

export interface ICart extends Document {
  customer: Schema.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
  size: { type: String }
}, { _id: false });

const CartSchema = new Schema<ICart>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [CartItemSchema], default: [] }
  },
  { timestamps: true }
);

export const Cart = model<ICart>("Cart", CartSchema);
