import { Router } from "express";
import { protect, adminOnly } from "../middlewares/auth";
import { upload } from "../middlewares/upload";
import {
  getHomeMedia,
  getHomeMediaSlots,
  getAdminHomeMedia,
  uploadHomeMediaFiles,
  createHomeMedia,
  updateHomeMedia,
  toggleHomeMedia,
  reorderHomeMedia,
  deleteHomeMedia
} from "../controllers/homeMedia";

const router = Router();

router.get("/", getHomeMedia);
router.get("/slots", protect, adminOnly, getHomeMediaSlots);
router.get("/admin", protect, adminOnly, getAdminHomeMedia);

router.post("/upload", protect, adminOnly, upload.array("images", 10), uploadHomeMediaFiles);
router.post("/", protect, adminOnly, createHomeMedia);

router.put("/reorder", protect, adminOnly, reorderHomeMedia);
router.put("/:id", protect, adminOnly, updateHomeMedia);
router.patch("/:id/toggle", protect, adminOnly, toggleHomeMedia);
router.delete("/:id", protect, adminOnly, deleteHomeMedia);

export default router;
