import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB maximum
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isCSV = file.mimetype === "text/csv" || 
                  file.mimetype === "application/vnd.ms-excel" ||
                  file.originalname.endsWith(".csv");

    if (isImage || isVideo || isCSV) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format. Please upload only images, videos, or CSV files.") as any, false);
    }
  }
});
