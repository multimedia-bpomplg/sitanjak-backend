// middlewares/upload.middleware.ts
import multer from "multer";
import fs from "fs";
import path from "path";

/* ================== HELPER ================== */
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/* ================== STORAGE LAPORAN AKHIR ================== */
const storageLaporanAkhir = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/laporan-akhir";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `laporan-akhir-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

/* ================== FILTER PDF ================== */
const pdfFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    cb(new Error("Hanya file PDF yang diperbolehkan"));
  } else {
    cb(null, true);
  }
};

/* ================== FILTER IMAGE/PDF ================== */
const imagePdfFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Hanya gambar atau PDF yang diperbolehkan"));
  }
};

/* ================== STORAGE SURAT ================== */
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
  destination: (_req, file, cb) => {
    const dir =
      file.mimetype === "application/pdf"
        ? "uploads/logbook/pdf"
        : "uploads/logbook/image";

    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const storageLogbookAlt = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = "uploads/logbook";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `logbook-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

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
  fileFilter: imagePdfFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const uploadLogbookAlt = multer({
  storage: storageLogbookAlt,
  fileFilter: imagePdfFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 5,
  },
});

// 🔥 BARU: Upload Laporan Akhir
export const uploadLaporanAkhir = multer({
  storage: storageLaporanAkhir,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
