import { Request, Response, NextFunction } from "express";
import { Category } from "../models/Category";

// Slugify helper
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const categories = await Category.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    return res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, description, image, sizes, allowCustomSize } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const slug = slugify(name);
    const existingCategory = await Category.findOne({ slug, isDeleted: { $ne: true } });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: "Category with this name/slug already exists" });
    }

    const category = await Category.create({
      name,
      slug,
      description: description || "",
      image: image || "",
      sizes: sizes || [],
      allowCustomSize: !!allowCustomSize
    });

    return res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, description, image, sizes, allowCustomSize } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (name) {
      category.name = name;
      category.slug = slugify(name);
    }
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (sizes !== undefined) category.sizes = sizes;
    if (allowCustomSize !== undefined) category.allowCustomSize = !!allowCustomSize;

    await category.save();
    return res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.isDeleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const timestamp = Date.now();
    category.isDeleted = true;
    category.slug = `${category.slug}-DEL-${timestamp}`;
    await category.save();

    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};
