import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "suratBalasan") {
      cb(null, "uploads/surat-balasan");
    } else if (file.fieldname === "suratPengantar") {
      cb(null, "uploads/surat-pengantar");
    } else {
      cb(null, "uploads");
    }
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.includes("pdf")) {
      cb(new Error("Hanya file PDF yang diperbolehkan"));
    } else {
      cb(null, true);
    }
  },
});
