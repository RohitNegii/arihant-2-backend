import { Schema, model, Document } from "mongoose";
import { HOME_MEDIA_SLOT_KEYS } from "../config/homeMediaSlots";

export interface IHomeMedia extends Document {
  slot: string;
  url: string;
  title: string;
  alt: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HomeMediaSchema = new Schema<IHomeMedia>(
  {
    slot: { type: String, required: true, enum: HOME_MEDIA_SLOT_KEYS, index: true },
    url: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    alt: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

HomeMediaSchema.index({ slot: 1, order: 1 });

export const HomeMedia = model<IHomeMedia>("HomeMedia", HomeMediaSchema);
