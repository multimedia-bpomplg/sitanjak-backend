import { Router } from "express";
import multer from "multer";
import Pendaftaran from "../models/pendaftaran";

const router = Router();

// ===== Multer Setup untuk Upload Surat =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/"); // Pastikan folder uploads dibuat
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ======================
// ROUTE: POST /api/pendaftaran
// ======================
router.post("/", upload.single("surat"), async (req, res) => {
  try {
    const body = req.body;

    // Pastikan field wajib tidak kosong
    const requiredFields = [
      "nama",
      "email",
      "nohp",
      "sekolah",
      "jurusan",
      "tingkat",
      "alamat",
      "tanggalMulai",
      "tanggalSelesai",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return res.status(400).json({
          message: `Field '${field}' wajib diisi`,
        });
      }
    }

    // Simpan data
    await Pendaftaran.create({
      ...body,
      surat: req.file?.filename || null,
    });

    res.json({ message: "Pendaftaran berhasil disimpan!" });
  } catch (error: any) {
    console.error("Error Pendaftaran:", error);

    res.status(500).json({
      message: "Gagal menyimpan pendaftaran",
      error: error.message,
    });
  }
});

// ======================
// ROUTE: GET /api/pendaftaran/cek?nama=
// ======================
router.get("/cek", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi" });
    }

    const data = await Pendaftaran.findOne({ email });

    if (!data) {
      return res.status(404).json({ message: "Email tidak ditemukan" });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// Update status + jawaban admin
router.put("/update-status/:id", async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Gagal update status" });
  }
});

export default router;
