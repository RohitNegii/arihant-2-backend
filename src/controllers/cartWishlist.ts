import { Request, Response, NextFunction } from "express";
import { Cart } from "../models/Cart";
import { Product } from "../models/Product";
import { AuthRequest } from "../middlewares/auth";

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    let cart = await Cart.findOne({ customer: req.user?._id }).populate({
      path: "items.product",
      select: "name price stock images thumbnail slug sku status isDeleted sizes allowCustomSize hasVariants variants"
    });

    if (!cart) {
      cart = await Cart.create({ customer: req.user?._id, items: [] });
    }

    // Filter out deleted or draft products from active cart response
    const validItems = cart.items.filter(
      (item: any) => item.product && !item.product.isDeleted && item.product.status === "Published"
    );

    return res.json({ success: true, items: validItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item or update quantity in cart
// @route   POST /api/cart
// @access  Private
export const addToCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { productId, quantity, size, variant } = req.body;
    const qty = parseInt(quantity) || 1;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const product = await Product.findById(productId);
    if (!product || product.isDeleted || product.status !== "Published") {
      return res.status(404).json({ success: false, message: "Product not found or unavailable" });
    }

    // Size Validation
    const hasSizes = (product.sizes && product.sizes.length > 0) || product.allowCustomSize;
    let selectedSize = size ? String(size).trim() : "";

    if (hasSizes) {
      if (!selectedSize) {
        return res.status(400).json({ success: false, message: "Size selection is required for this product" });
      }
      
      // If the selected size is not in standard sizes and custom size is not allowed
      const isStandardSize = product.sizes && product.sizes.includes(selectedSize);
      if (!isStandardSize && !product.allowCustomSize) {
        return res.status(400).json({ success: false, message: `Selected size '${selectedSize}' is invalid` });
      }
    } else {
      // Clear size if product does not have sizes to ensure compatibility
      selectedSize = "";
    }

    // Variant Validation
    let selectedVariant = variant ? String(variant).trim() : "";
    if (product.hasVariants) {
      if (!selectedVariant) {
        return res.status(400).json({ success: false, message: "Variant selection is required for this product" });
      }
      const isVal = product.variants?.some(
        (v) => v.name.toLowerCase() === selectedVariant.toLowerCase()
      );
      if (!isVal) {
        return res.status(400).json({ success: false, message: `Selected variant '${selectedVariant}' is invalid` });
      }
    } else {
      selectedVariant = "";
    }

    let cart = await Cart.findOne({ customer: req.user?._id });
    if (!cart) {
      cart = await Cart.create({ customer: req.user?._id, items: [] });
    }

    // Find item with same product ID, size, and variant
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.size === selectedSize || (!item.size && !selectedSize)) &&
        (item.variant === selectedVariant || (!item.variant && !selectedVariant))
    );

    if (itemIndex > -1) {
      // Item exists, update quantity
      cart.items[itemIndex].quantity += qty;
    } else {
      // Add new item
      cart.items.push({
        product: productId as any,
        quantity: qty,
        size: selectedSize || undefined,
        variant: selectedVariant || undefined
      });
    }

    await cart.save();
    
    const populatedCart = await cart.populate({
      path: "items.product",
      select: "name price stock images thumbnail slug sku sizes allowCustomSize hasVariants variants"
    });

    return res.json({ success: true, items: populatedCart.items });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item quantity directly (set exact quantity)
// @route   PUT /api/cart/quantity
// @access  Private
export const updateCartQuantity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { productId, quantity, size, variant } = req.body;
    const qty = parseInt(quantity);
    const selectedSize = size ? String(size).trim() : "";
    const selectedVariant = variant ? String(variant).trim() : "";

    if (!productId || qty === undefined || qty < 1) {
      return res.status(400).json({ success: false, message: "Invalid product or quantity" });
    }

    const cart = await Cart.findOne({ customer: req.user?._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.size === selectedSize || (!item.size && !selectedSize)) &&
        (item.variant === selectedVariant || (!item.variant && !selectedVariant))
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = qty;
      await cart.save();
    } else {
      return res.status(404).json({ success: false, message: "Item not in cart" });
    }

    const populatedCart = await cart.populate({
      path: "items.product",
      select: "name price stock images thumbnail slug sku sizes allowCustomSize hasVariants variants"
    });

    return res.json({ success: true, items: populatedCart.items });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
export const removeFromCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { size, variant } = req.query;
    const selectedSize = size ? String(size).trim() : "";
    const selectedVariant = variant ? String(variant).trim() : "";

    const cart = await Cart.findOne({ customer: req.user?._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === req.params.productId &&
          (item.size === selectedSize || (!item.size && !selectedSize)) &&
          (item.variant === selectedVariant || (!item.variant && !selectedVariant))
        )
    );
    await cart.save();

    const populatedCart = await cart.populate({
      path: "items.product",
      select: "name price stock images thumbnail slug sku sizes allowCustomSize hasVariants variants"
    });

    return res.json({ success: true, items: populatedCart.items });
  } catch (error) {
    next(error);
  }
};
