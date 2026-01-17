import { Request, Response } from "express";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";

/* =========================
    CREATE PENDAFTARAN
  ========================= */
export const createPendaftaran = async (req: Request, res: Response) => {
  try {
    let { kategori, jumlahPeserta, peserta } = req.body;

    /* ===== VALIDASI DASAR ===== */
    if (!kategori || !jumlahPeserta || !peserta) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Surat pengantar wajib diupload",
      });
    }

    /* ===== SAFE PARSE PESERTA ===== */
    let pesertaRaw: any[];
    try {
      pesertaRaw = typeof peserta === "string" ? JSON.parse(peserta) : peserta;
    } catch {
      return res.status(400).json({
        message: "Format data peserta tidak valid",
      });
    }

    if (!Array.isArray(pesertaRaw) || pesertaRaw.length === 0) {
      return res.status(400).json({
        message: "Peserta wajib diisi",
      });
    }

    /* ===== NORMALISASI + VALIDASI PESERTA ===== */
    const pesertaFix = pesertaRaw.map((p, i) => {
      if (
        !p.nama ||
        !p.posisi ||
        !p.asalJenis ||
        !p.asalNama ||
        !p.jurusan || // ⬅️ TAMBAHAN
        !p.tanggalMulaiMagang ||
        !p.tanggalSelesaiMagang ||
        !p.tempatLahir ||
        !p.tanggalLahir ||
        !p.jenisKelamin ||
        !p.provinsi ||
        !p.kota ||
        !p.kecamatan ||
        !p.kelurahan ||
        !p.alamatLengkap ||
        !p.email ||
        !p.wa
      ) {
        throw new Error(`Data peserta ke-${i + 1} tidak lengkap`);
      }

      if (p.tanggalSelesaiMagang < p.tanggalMulaiMagang) {
        throw new Error(
          `Tanggal selesai harus setelah tanggal mulai (Peserta ${i + 1})`
        );
      }

      return {
        nama: p.nama,
        posisi: p.posisi,

        jurusan: p.jurusan, // ✅ PINDAHKAN KE SINI

        asal: {
          jenis: p.asalJenis,
          nama: p.asalNama,
        },

        tanggalMulaiMagang: p.tanggalMulaiMagang,
        tanggalSelesaiMagang: p.tanggalSelesaiMagang,

        tempatLahir: p.tempatLahir,
        tanggalLahir: p.tanggalLahir,
        jenisKelamin: p.jenisKelamin,

        provinsi: p.provinsi,
        kota: p.kota,
        kecamatan: p.kecamatan,
        kelurahan: p.kelurahan,
        alamatLengkap: p.alamatLengkap,

        email: p.email,
        wa: p.wa,

        mentor: null,
      };
    });

    /* ===== FIX JUMLAH PESERTA ===== */
    const jumlahFix = Number(jumlahPeserta);
    if (isNaN(jumlahFix) || jumlahFix < 1 || jumlahFix > 5) {
      return res.status(400).json({
        message: "Jumlah peserta harus antara 1 sampai 5",
      });
    }

    if (jumlahFix !== pesertaFix.length) {
      return res.status(400).json({
        message: "Jumlah peserta tidak sesuai dengan data peserta",
      });
    }

    /* ===== SIMPAN KE DATABASE ===== */
    const data = await Pendaftaran.create({
      kategori,
      jumlahPeserta: jumlahFix,
      peserta: pesertaFix,
      suratPengantar: `surat-pengantar/${req.file.filename}`,
    });

    return res.status(201).json({
      message: "Pendaftaran berhasil",
      data,
    });
  } catch (err: any) {
    console.error("❌ CREATE PENDAFTARAN ERROR:", err);

    return res.status(500).json({
      message: err.message || "Gagal menyimpan pendaftaran",
    });
  }
};

/* =========================
    GET ALL PENDAFTARAN
  ========================= */
export const getAllPendaftaran = async (_req: Request, res: Response) => {
  try {
    const data = await Pendaftaran.find()
      .populate("peserta.mentor", "name email posisiMentor")
      .sort({ createdAt: -1 });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      message: "Gagal mengambil data pendaftaran",
      error: err.message,
    });
  }
};

/* =========================
    CEK PENDAFTARAN BY EMAIL
  ========================= */
export const cekPendaftaran = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        message: "Email wajib diisi",
      });
    }

    const data = await Pendaftaran.findOne({
      "peserta.email": email,
    }).populate("mentor", "name email posisiMentor");

    if (!data) {
      return res.status(404).json({
        message: "Data tidak ditemukan",
      });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      message: "Gagal mengecek pendaftaran",
      error: err.message,
    });
  }
};

/* =========================
    UPDATE STATUS + SURAT BALASAN
  ========================= */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { status, jawabanAdmin } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status wajib diisi",
      });
    }

    const updateData: any = {
      status,
      jawabanAdmin,
    };

    if (req.file) {
      updateData.suratBalasan = `surat-balasan/${req.file.filename}`;
    }

    const data = await Pendaftaran.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!data) {
      return res.status(404).json({
        message: "Data pendaftaran tidak ditemukan",
      });
    }

    return res.json({
      message: "Status berhasil diperbarui",
      data,
    });
  } catch (err: any) {
    console.error("❌ UPDATE STATUS ERROR:", err);

    return res.status(500).json({
      message: "Gagal memperbarui status",
      error: err.message,
    });
  }
};

/* =========================
   SET MENTOR PENDAFTARAN
========================= */
export const setMentorPendaftaran = async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.body;

    if (!mentorId) {
      return res.status(400).json({
        message: "mentorId wajib dikirim",
      });
    }

    // validasi mentor
    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({
        message: "Mentor tidak ditemukan",
      });
    }

    const updated = await Pendaftaran.findByIdAndUpdate(
      req.params.id,
      { mentor: mentorId },
      { new: true }
    ).populate("mentor", "name email posisiMentor");

    if (!updated) {
      return res.status(404).json({
        message: "Pendaftaran tidak ditemukan",
      });
    }

    return res.json({
      message: "Mentor berhasil ditambahkan",
      data: updated,
    });
  } catch (error: any) {
    console.error("[SET MENTOR ERROR]", error);
    return res.status(500).json({
      message: "Gagal menambahkan mentor",
    });
  }
};

/* =========================
    SET MENTOR 1 PER PESERTA
  ========================= */
export const setMentorPeserta = async (req: Request, res: Response) => {
  try {
    const { email, mentorId } = req.body;

    if (!email || !mentorId) {
      return res.status(400).json({ message: "Email & mentorId wajib" });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ message: "Mentor tidak ditemukan" });
    }

    const pendaftaran = await Pendaftaran.findOne({
      _id: req.params.id,
      "peserta.email": email,
    });

    if (!pendaftaran) {
      return res.status(404).json({ message: "Peserta tidak ditemukan" });
    }

    const peserta = pendaftaran.peserta.find((p: any) => p.email === email);

    peserta.mentor = mentorId;

    await pendaftaran.save();

    const populated = await Pendaftaran.findById(req.params.id).populate(
      "peserta.mentor",
      "name email posisiMentor"
    );

    return res.json({
      message: "Mentor peserta berhasil disimpan",
      data: populated,
    });
  } catch (err) {
    return res.status(500).json({ message: "Gagal set mentor peserta" });
  }
};
