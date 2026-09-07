import { Request, Response, NextFunction } from "express";
import { HomeMedia } from "../models/HomeMedia";
import { AuthRequest } from "../middlewares/auth";
import { HOME_MEDIA_SLOTS, HOME_MEDIA_SLOT_KEYS } from "../config/homeMediaSlots";
import { saveImageLocal, deleteImageLocal } from "../services/localStorage";

const isManagedFile = (url: string) => !!url && url.startsWith("/uploads/home-media/");

// @desc    Public homepage media manifest, active items grouped by slot
// @route   GET /api/home-media
// @access  Public
export const getHomeMedia = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const items = await HomeMedia.find({ isActive: true })
      .sort({ slot: 1, order: 1, createdAt: 1 })
      .select("slot url title alt order");

    const media: Record<string, any[]> = {};
    for (const slot of HOME_MEDIA_SLOTS) {
      const forSlot = items.filter((item) => item.slot === slot.key);
      media[slot.key] = slot.maxUsed ? forSlot.slice(0, slot.maxUsed) : forSlot;
    }

    return res.json({ success: true, media });
  } catch (error) {
    next(error);
  }
};

// @desc    Slot catalogue describing where each photo appears on the site
// @route   GET /api/home-media/slots
// @access  Private/Admin
export const getHomeMediaSlots = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    return res.json({ success: true, slots: HOME_MEDIA_SLOTS });
  } catch (error) {
    next(error);
  }
};

// @desc    All homepage media including inactive
// @route   GET /api/home-media/admin
// @access  Private/Admin
export const getAdminHomeMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const items = await HomeMedia.find().sort({ slot: 1, order: 1, createdAt: 1 });
    return res.json({ success: true, count: items.length, items });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload homepage media files
// @route   POST /api/home-media/upload
// @access  Private/Admin
export const uploadHomeMediaFiles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const urls = await Promise.all(
      files.map((file) => saveImageLocal(file.buffer, file.originalname, "home-media"))
    );

    return res.json({ success: true, urls });
  } catch (error) {
    next(error);
  }
};

// @desc    Create homepage media item
// @route   POST /api/home-media
// @access  Private/Admin
export const createHomeMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { slot, url, title, alt, order, isActive } = req.body;

    if (!slot || !url || !title) {
      return res.status(400).json({ success: false, message: "Slot, image and title are required" });
    }

    if (!HOME_MEDIA_SLOT_KEYS.includes(slot)) {
      return res.status(400).json({ success: false, message: `Unknown slot "${slot}"` });
    }

    const last = await HomeMedia.findOne({ slot }).sort({ order: -1 }).select("order");

    const item = await HomeMedia.create({
      slot,
      url: String(url).trim(),
      title: String(title).trim(),
      alt: alt ? String(alt).trim() : "",
      order: order !== undefined ? Number(order) : (last?.order ?? -1) + 1,
      isActive: isActive !== undefined ? !!isActive : true
    });

    return res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Update homepage media item
// @route   PUT /api/home-media/:id
// @access  Private/Admin
export const updateHomeMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { url, title, alt, order, isActive } = req.body;
    const item = await HomeMedia.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Media item not found" });
    }

    if (url !== undefined && url !== item.url) {
      const previous = item.url;
      item.url = String(url).trim();
      if (isManagedFile(previous)) await deleteImageLocal(previous);
    }
    if (title !== undefined) item.title = String(title).trim();
    if (alt !== undefined) item.alt = String(alt).trim();
    if (order !== undefined) item.order = Number(order);
    if (isActive !== undefined) item.isActive = !!isActive;

    await item.save();
    return res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Flip active state
// @route   PATCH /api/home-media/:id/toggle
// @access  Private/Admin
export const toggleHomeMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const item = await HomeMedia.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Media item not found" });
    }

    item.isActive = !item.isActive;
    await item.save();

    return res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk reorder items within a slot
// @route   PUT /api/home-media/reorder
// @access  Private/Admin
export const reorderHomeMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "An items array is required" });
    }

    await HomeMedia.bulkWrite(
      items.map((entry: { id: string; order: number }) => ({
        updateOne: {
          filter: { _id: entry.id },
          update: { $set: { order: Number(entry.order) } }
        }
      }))
    );

    return res.json({ success: true, message: "Order updated" });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete homepage media item
// @route   DELETE /api/home-media/:id
// @access  Private/Admin
export const deleteHomeMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const item = await HomeMedia.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Media item not found" });
    }

    if (isManagedFile(item.url)) await deleteImageLocal(item.url);

    return res.json({ success: true, message: "Media item deleted" });
  } catch (error) {
    next(error);
  }
};
