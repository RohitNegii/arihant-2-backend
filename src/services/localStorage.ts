import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Saves a file buffer locally under /uploads/<folder>/ directory.
 * Returns the relative URL path to be saved in the database.
 */
export const saveImageLocal = async (
  fileBuffer: Buffer,
  originalName: string,
  folder: string = "products"
): Promise<string> => {
  const uploadsDir = path.join(process.cwd(), "uploads", folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = path.extname(originalName) || ".jpg";
  const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const filePath = path.join(uploadsDir, uniqueName);

  await fs.promises.writeFile(filePath, fileBuffer);

  return `/uploads/${folder}/${uniqueName}`;
};

/**
 * Deletes a local image from the uploads directory.
 */
export const deleteImageLocal = async (imagePath: string): Promise<void> => {
  try {
    if (!imagePath || !imagePath.startsWith("/uploads/")) return;

    // Convert relative path like "/uploads/products/file.jpg" to physical file path
    const relativePath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    const absolutePath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
      console.log(`Local image deleted successfully: ${absolutePath}`);
    } else {
      console.log(`Local image path not found on disk: ${absolutePath}`);
    }
  } catch (error) {
    console.error("Failed to delete local image:", error);
  }
};
