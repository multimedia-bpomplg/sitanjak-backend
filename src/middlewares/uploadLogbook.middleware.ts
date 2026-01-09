import multer from "multer";
import path from "path";
import fs from "fs";

/* ================= FOLDER UPLOAD ================= */
const uploadDir = path.join(process.cwd(), "uploads/logbook");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ================= STORAGE ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `logbook-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;
    cb(null, filename);
  },
});

/* ================= FILE FILTER ================= */
const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Hanya file gambar yang diperbolehkan"));
  } else {
    cb(null, true);
  }
};

/* ================= MULTER INSTANCE ================= */
export const uploadLogbook = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB / foto
    files: 3, // maksimal 3 foto
  },
});
