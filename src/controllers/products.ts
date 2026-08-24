import { Request, Response, NextFunction } from "express";
import { Product } from "../models/Product";
import { Setting } from "../models/Setting";
import { Category } from "../models/Category";
import { Order } from "../models/Order";
import { AuthRequest } from "../middlewares/auth";
import { saveImageLocal, deleteImageLocal } from "../services/localStorage";

// Slugify helper
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// Helper to apply global discount to a product object
export const applyDiscountToProduct = (productObj: any, discount: { percentage: number; enabled: boolean }) => {
  if (!productObj) return productObj;

  if (!discount || !discount.enabled || discount.percentage <= 0) {
    // If no discount is active, discountPrice should not be populated
    return productObj;
  }

  const discountRate = (100 - discount.percentage) / 100;

  if (productObj.hasVariants && productObj.variants) {
    productObj.variants = productObj.variants.map((v: any) => ({
      ...v,
      discountPrice: Math.round(v.price * discountRate)
    }));

    // Set product.discountPrice to the minimum variant discountPrice
    if (productObj.variants.length > 0) {
      const discountPrices = productObj.variants.map((v: any) => v.discountPrice).filter((p: any) => p !== undefined);
      if (discountPrices.length > 0) {
        productObj.discountPrice = Math.min(...discountPrices);
      }
    }
  } else if (productObj.price !== undefined && productObj.price !== null) {
    productObj.discountPrice = Math.round(productObj.price * discountRate);
  }

  return productObj;
};

// @desc    Get public catalog products with sorting, filtering, searching and pagination
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: false, status: "Published" };

    // Real-time Search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { description: searchRegex },
        { shortDescription: searchRegex }
      ];
    }

    // Filters
    if (req.query.category) {
      const categoryDoc = await Category.findOne({ slug: req.query.category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
        // If category is not found, return empty results immediately
        return res.json({ success: true, page, pages: 0, count: 0, products: [] });
      }
    }

    if (req.query.material) {
      query.material = new RegExp(`^${req.query.material}$`, "i");
    }

    if (req.query.gender) {
      query.gender = req.query.gender;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const min = req.query.minPrice ? parseFloat(req.query.minPrice as string) : null;
      const max = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : null;

      const priceCondition: any = {};
      const variantPriceCondition: any = {};

      if (min !== null) {
        priceCondition.$gte = min;
        variantPriceCondition.$gte = min;
      }
      if (max !== null) {
        priceCondition.$lte = max;
        variantPriceCondition.$lte = max;
      }

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          {
            hasVariants: false,
            price: priceCondition
          },
          {
            hasVariants: true,
            "variants.price": variantPriceCondition
          }
        ]
      });
    }

    if (req.query.availability === "in-stock") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          {
            hasVariants: false,
            stock: { $gt: 0 }
          },
          {
            hasVariants: true,
            "variants.stock": { $gt: 0 }
          }
        ]
      });
    }

    // Sorting
    let sortQuery: any = { createdAt: -1 }; // default: latest
    if (req.query.sort) {
      const sortVal = req.query.sort as string;
      if (sortVal === "price-asc") {
        sortQuery = { price: 1 };
      } else if (sortVal === "price-desc") {
        sortQuery = { price: -1 };
      } else if (sortVal === "bestselling") {
        sortQuery = { isBestSeller: -1, createdAt: -1 };
      } else if (sortVal === "featured") {
        sortQuery = { isFeatured: -1, createdAt: -1 };
      }
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category", "name slug")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const discountSetting = await Setting.findOne({ key: "discount" });
    const discount = discountSetting?.value || { percentage: 0, enabled: false };
    const productsWithDiscount = products.map((p) => applyDiscountToProduct(p.toObject(), discount));

    return res.json({
      success: true,
      page,
      pages: Math.ceil(total / limit),
      count: total,
      products: productsWithDiscount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin products list (includes Draft/Deleted statuses)
// @route   GET /api/products/admin
// @access  Private/Admin
export const getAdminProducts = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { search, category, status, stockStatus } = req.query;
    const filter: any = { isDeleted: false };

    if (search) {
      const searchRegex = new RegExp(String(search), "i");
      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { description: searchRegex },
        { material: searchRegex },
        { purity: searchRegex }
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (stockStatus) {
      filter.$and = filter.$and || [];
      if (stockStatus === "in-stock") {
        filter.$and.push({
          $or: [
            { hasVariants: false, stock: { $gt: 0 } },
            { hasVariants: true, "variants.stock": { $gt: 0 } }
          ]
        });
      } else if (stockStatus === "out-of-stock") {
        filter.$and.push({
          $or: [
            { hasVariants: false, stock: 0 },
            { hasVariants: true, "variants.stock": { $not: { $gt: 0 } } }
          ]
        });
      }
    }

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by slug
// @route   GET /api/products/:slug
// @access  Public
export const getProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isDeleted: false })
      .populate("category", "name slug");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const discountSetting = await Setting.findOne({ key: "discount" });
    const discount = discountSetting?.value || { percentage: 0, enabled: false };
    const productWithDiscount = applyDiscountToProduct(product.toObject(), discount);

    return res.json({ success: true, product: productWithDiscount });
  } catch (error) {
    next(error);
  }
};

// @desc    Get related products
// @route   GET /api/products/related/:id
// @access  Public
export const getRelatedProducts = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const related = await Product.find({
      _id: { $ne: product._id },
      isDeleted: false,
      status: "Published",
      category: product.category
    })
      .limit(4)
      .populate("category", "name slug");

    const discountSetting = await Setting.findOne({ key: "discount" });
    const discount = discountSetting?.value || { percentage: 0, enabled: false };
    const relatedWithDiscount = related.map((p) => applyDiscountToProduct(p.toObject(), discount));

    return res.json({ success: true, products: relatedWithDiscount });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      name, sku, description, shortDescription, categoryId,
      material, purity, weight, dimensions, gender, occasion,
      price, stock, status, isFeatured, isTrending, isBestSeller,
      images, thumbnail, sizes, allowCustomSize,
      hasVariants, variants
    } = req.body;

    const isPriceRequired = !hasVariants;
    if (
      !name ||
      !sku ||
      (isPriceRequired && (price === undefined || price === null)) ||
      !categoryId ||
      !material ||
      !purity ||
      weight === undefined
    ) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const slug = `${slugify(name)}-${sku.toLowerCase()}`;
    const productExists = await Product.findOne({ $or: [{ slug }, { sku: sku.toUpperCase() }] });
    if (productExists) {
      return res.status(400).json({ success: false, message: "Product slug or SKU already exists" });
    }

    const product = await Product.create({
      name,
      slug,
      sku: sku.toUpperCase(),
      description,
      shortDescription,
      category: categoryId,
      material,
      purity,
      weight,
      dimensions: dimensions || "",
      gender: gender || "Unisex",
      occasion: occasion || "",
      price: hasVariants ? undefined : price,
      stock: hasVariants ? 0 : (stock || 0),
      status: status || "Draft",
      isFeatured: !!isFeatured,
      isTrending: !!isTrending,
      isBestSeller: !!isBestSeller,
      images: images || [],
      thumbnail: thumbnail || "",
      sizes: sizes || [],
      allowCustomSize: !!allowCustomSize,
      hasVariants: !!hasVariants,
      variants: hasVariants && Array.isArray(variants) ? variants.map((v: any) => ({
        name: v.name,
        price: v.price,
        stock: v.stock,
        sku: v.sku,
        images: Array.isArray(v.images) ? v.images : [],
        video: v.video || ""
      })) : []
    });

    return res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload product images (Admin)
// @route   POST /api/products/upload-images
// @access  Private/Admin
export const uploadProductImages = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const files = req.files as Express.Multer.File[];
    const uploadPromises = files.map((file) => saveImageLocal(file.buffer, file.originalname));
    const imageUrls = await Promise.all(uploadPromises);

    return res.json({
      success: true,
      urls: imageUrls
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      name, sku, description, shortDescription, categoryId,
      material, purity, weight, dimensions, gender, occasion,
      price, stock, status, isFeatured, isTrending, isBestSeller,
      images, thumbnail, sizes, allowCustomSize,
      hasVariants, variants
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Collect all old media files for deletion comparison
    const oldMediaFiles = new Set<string>();
    if (product.images) product.images.forEach((img) => oldMediaFiles.add(img));
    if (product.thumbnail) oldMediaFiles.add(product.thumbnail);
    if (product.variants) {
      product.variants.forEach((v) => {
        if (v.images) v.images.forEach((img) => oldMediaFiles.add(img));
        if (v.video) oldMediaFiles.add(v.video);
      });
    }

    if (name) {
      product.name = name;
      product.slug = `${slugify(name)}-${(sku || product.sku).toLowerCase()}`;
    }
    if (sku) product.sku = sku.toUpperCase();
    if (description !== undefined) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (categoryId) product.category = categoryId;
    if (material !== undefined) product.material = material;
    if (purity !== undefined) product.purity = purity;
    if (weight !== undefined) product.weight = weight;
    if (dimensions !== undefined) product.dimensions = dimensions;
    if (gender !== undefined) product.gender = gender;
    if (occasion !== undefined) product.occasion = occasion;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (status !== undefined) product.status = status;
    if (isFeatured !== undefined) product.isFeatured = !!isFeatured;
    if (isTrending !== undefined) product.isTrending = !!isTrending;
    if (isBestSeller !== undefined) product.isBestSeller = !!isBestSeller;
    if (sizes !== undefined) product.sizes = sizes;
    if (allowCustomSize !== undefined) product.allowCustomSize = !!allowCustomSize;
    if (hasVariants !== undefined) {
      product.hasVariants = !!hasVariants;
      if (hasVariants) {
        product.price = undefined;
        product.stock = 0;
      }
    }
    if (variants !== undefined && Array.isArray(variants)) {
      product.variants = variants.map((v: any) => ({
        name: v.name,
        price: v.price,
        stock: v.stock,
        sku: v.sku,
        images: Array.isArray(v.images) ? v.images : [],
        video: v.video || ""
      }));
    }

    if (images) {
      product.images = images;
    }

    if (thumbnail) {
      product.thumbnail = thumbnail;
    }

    // Collect all new media files
    const newMediaFiles = new Set<string>();
    if (product.images) product.images.forEach((img) => newMediaFiles.add(img));
    if (product.thumbnail) newMediaFiles.add(product.thumbnail);
    if (product.variants) {
      product.variants.forEach((v) => {
        if (v.images) v.images.forEach((img) => newMediaFiles.add(img));
        if (v.video) newMediaFiles.add(v.video);
      });
    }

    // Delete unused media files
    const deletedFiles = Array.from(oldMediaFiles).filter((f) => !newMediaFiles.has(f));
    await Promise.all(deletedFiles.map((f) => deleteImageLocal(f)));

    await product.save();
    return res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Delete physical files from local storage to release disk space
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        await deleteImageLocal(img);
      }
    }
    if (product.thumbnail) {
      await deleteImageLocal(product.thumbnail);
    }

    // Soft delete & release SKU and slug unique constraints
    const timestamp = Date.now();
    product.isDeleted = true;
    product.sku = `${product.sku}-DEL-${timestamp}`;
    product.slug = `${product.slug}-DEL-${timestamp}`;
    await product.save();

    return res.json({ success: true, message: "Product soft deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Add review to product
// @route   POST /api/products/:id/reviews
// @access  Private
export const addProductReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: "Rating and comment are required" });
    }

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if user has already reviewed the product
    const alreadyReviewed = product.reviews?.find(
      (r) => r.user.toString() === req.user?._id?.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: "You have already reviewed this product" });
    }

    // Check if user has purchased the product
    const hasBought = await Order.findOne({
      customer: req.user?._id,
      paymentStatus: "Paid",
      "items.product": productId
    });

    if (!hasBought) {
      return res.status(403).json({
        success: false,
        message: "You can only review products you have purchased"
      });
    }

    const review = {
      user: req.user?._id as any,
      name: req.user?.name || "Anonymous Patron",
      rating: Number(rating),
      comment: String(comment),
      createdAt: new Date()
    };

    if (!product.reviews) product.reviews = [];
    product.reviews.push(review);
    await product.save();

    return res.status(201).json({ success: true, message: "Review added successfully", reviews: product.reviews });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if user can review product
// @route   GET /api/products/:id/can-review
// @access  Private
export const checkCanReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!req.user) {
      return res.json({ success: true, canReview: false, message: "Please log in to leave a review" });
    }

    // Check if user has already reviewed
    const alreadyReviewed = product.reviews?.some(
      (r) => r.user.toString() === req.user?._id?.toString()
    );
    if (alreadyReviewed) {
      return res.json({ success: true, canReview: false, message: "You have already reviewed this product" });
    }

    // Check if user has purchased the product
    const hasBought = await Order.findOne({
      customer: req.user?._id,
      paymentStatus: "Paid",
      "items.product": productId
    });

    return res.json({
      success: true,
      canReview: !!hasBought,
      message: hasBought ? "You can review this product" : "You must purchase this product to leave a review"
    });
  } catch (error) {
    next(error);
  }
};
