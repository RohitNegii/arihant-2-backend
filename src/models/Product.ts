import { Schema, model, Document } from "mongoose";

export interface IReview {
  user: Schema.Types.ObjectId;
  name: string;
  rating: number;
  comment: string;
  order?: Schema.Types.ObjectId;
  createdAt: Date;
}

export interface IVariant {
  name: string;
  price: number;
  stock: number;
  sku?: string;
  images?: string[];
  video?: string;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  category: Schema.Types.ObjectId;
  material: string;
  purity: string;
  weight: number;
  dimensions?: string;
  gender: "Men" | "Women" | "Unisex";
  occasion?: string;
  price?: number;
  stock?: number;
  status: "Draft" | "Published";
  isFeatured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  images: string[];
  thumbnail: string;
  isDeleted: boolean;
  sizes?: string[];
  allowCustomSize?: boolean;
  hasVariants?: boolean;
  variants?: IVariant[];
  reviews?: IReview[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  order: { type: Schema.Types.ObjectId, ref: "Order" },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    sku: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    material: { type: String, required: true, trim: true },
    purity: { type: String, required: true, trim: true },
    weight: { type: Number, required: true },
    dimensions: { type: String, default: "" },
    gender: { type: String, enum: ["Men", "Women", "Unisex"], default: "Unisex" },
    occasion: { type: String, default: "" },
    price: { type: Number, required: function(this: any) { return !this.hasVariants; }, min: 0 },
    stock: { type: Number, required: function(this: any) { return !this.hasVariants; }, default: 0, min: 0 },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    images: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
    sizes: { type: [String], default: [] },
    allowCustomSize: { type: Boolean, default: false },
    hasVariants: { type: Boolean, default: false },
    variants: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          price: { type: Number, required: true, min: 0 },
          stock: { type: Number, required: true, default: 0, min: 0 },
          sku: { type: String, uppercase: true, trim: true },
          images: { type: [String], default: [] },
          video: { type: String, default: "" }
        }
      ],
      default: []
    },
    reviews: { type: [ReviewSchema], default: [] }
  },
  { timestamps: true }
);

export const Product = model<IProduct>("Product", ProductSchema);
