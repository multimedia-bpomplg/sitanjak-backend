import { Router } from "express";
import multer from "multer";
import Pendaftaran from "../models/Pendaftaran";

const router = Router();

/* ==========================
   MULTER CONFIG
========================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ==========================
   POST /api/pendaftaran
========================== */
router.post("/", upload.single("surat"), async (req, res) => {
  try {
    const { kategori, jumlahPeserta, peserta } = req.body;

    if (!kategori || !jumlahPeserta || !peserta) {
      return res.status(400).json({
        message: "Data pendaftaran tidak lengkap",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Surat pengantar wajib diupload",
      });
    }

    const parsedPeserta = JSON.parse(peserta);

    const data = await Pendaftaran.create({
      kategori,
      jumlahPeserta,
      peserta: parsedPeserta,
      suratPengantar: req.file.filename,
    });

    res.status(201).json({
      message: "Pendaftaran berhasil dikirim",
      data,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: "Gagal menyimpan pendaftaran",
      error: error.message,
    });
  }
});

/* ==========================
   GET /api/pendaftaran
   (Admin)
========================== */
router.get("/", async (_req, res) => {
  const data = await Pendaftaran.find().sort({ createdAt: -1 });
  res.json(data);
});

/* ==========================
   GET /api/pendaftaran/cek
========================== */
router.get("/cek", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi" });
  }

  const data = await Pendaftaran.findOne({
    "peserta.email": email,
  });

  if (!data) {
    return res.status(404).json({
      message: "Data tidak ditemukan",
    });
  }

  res.json(data);
});

/* ==========================
   PUT /api/pendaftaran/:id
========================== */
router.put("/:id", async (req, res) => {
  const { status, jawabanAdmin } = req.body;

  const data = await Pendaftaran.findByIdAndUpdate(
    req.params.id,
    { status, jawabanAdmin },
    { new: true }
  );

  res.json({
    message: "Status berhasil diperbarui",
    data,
  });
});

export default router;
