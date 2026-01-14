import multer from "multer";
import fs from "fs";

/* ================== HELPER ================== */
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/* ================== STORAGE ================== */
const storagePengantar = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/surat-pengantar";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const storageBalasan = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/surat-balasan";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

/* ================== STORAGE LOGBOOK ================== */
const storageLogbook = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/logbook";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `logbook-${Date.now()}.${ext}`);
  },
});

/* ================== FILTER IMAGE ================== */
const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Hanya file gambar yang diperbolehkan"));
  } else {
    cb(null, true);
  }
};

/* ================== FILTER ================== */
const pdfFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    cb(new Error("Hanya file PDF yang diperbolehkan"));
  } else {
    cb(null, true);
  }
};

/* ================== EXPORT ================== */
export const uploadSuratPengantar = multer({
  storage: storagePengantar,
  fileFilter: pdfFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadSuratBalasan = multer({
  storage: storageBalasan,
  fileFilter: pdfFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadLogbook = multer({
  storage: storageLogbook,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
