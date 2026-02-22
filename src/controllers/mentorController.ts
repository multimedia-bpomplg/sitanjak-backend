import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";
import { sendEmail } from "../utils/sendEmail";
import { mentorEmailTemplate } from "../utils/mentorEmailTemplate";
import Pendaftaran from "../models/pendaftaran";
import Logbook from "../models/Logbook";

/* ================= BUAT AKUN MENTOR + EMAIL ================= */
export const buatMentor = async (req: Request, res: Response) => {
  try {
    const { name, email, password, posisiMentor } = req.body;

    if (!name || !email || !password || !posisiMentor) {
      return res.status(400).json({
        message: "Nama, email, password, dan posisi mentor wajib diisi",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }

    const mentorRole = await Role.findOne({ name: "mentor" });
    if (!mentorRole) {
      return res.status(500).json({ message: "Role mentor tidak tersedia" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const mentor = await User.create({
      name,
      email,
      password: hashed,
      roles: [mentorRole._id],
      status: "Aktif",
      posisiMentor,
    });

    await sendEmail({
      to: email,
      subject: "Akun Mentor Magang",
      html: mentorEmailTemplate({
        name,
        email,
        password,
        role: "Mentor",
        pesertaBimbingan: [],
      }),
    });

    res.status(201).json({
      message: "Akun mentor berhasil dibuat",
      mentor,
    });
  } catch (err) {
    console.error("[BUAT MENTOR]", err);
    res.status(500).json({ message: "Gagal membuat akun mentor" });
  }
};

/* ================= GET DATA MENTOR ================= */
export const getMentor = async (_req: Request, res: Response) => {
  try {
    const role = await Role.findOne({ name: "mentor" });

    const data = await User.find({ roles: role?._id }).select(
      "name email status posisiMentor",
    );

    res.json(data);
  } catch {
    res.status(500).json({ message: "Gagal memuat mentor" });
  }
};

/* ================= NONAKTIFKAN ================= */
export const nonaktifkanMentor = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Nonaktif",
    });

    res.json({ message: "Akun mentor berhasil dinonaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal menonaktifkan akun mentor" });
  }
};

/* ================= AKTIFKAN ================= */
export const aktifkanMentor = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Aktif",
    });

    res.json({ message: "Akun mentor berhasil diaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal mengaktifkan akun mentor" });
  }
};

/* ================= GET PESERTA BIMBINGAN (FULL + MAGANG DATE) ================= */
export const getPesertaBimbingan = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;

    const pendaftaranList = await Pendaftaran.find({
      status: "Disetujui",
      "peserta.mentor": mentorId,
    }).populate("peserta.mentor", "name email posisiMentor");

    const peserta = pendaftaranList.flatMap((pendaftaran) =>
      pendaftaran.peserta
        .filter((ps: any) => ps.mentor && ps.mentor._id.toString() === mentorId)
        .map((ps: any) => ({
          /* ================= IDENTITAS ================= */
          nama: ps.nama,
          email: ps.email,
          wa: ps.wa,
          posisi: ps.posisi,
          jurusan: ps.jurusan,

          /* ================= DATA DIRI ================= */
          jenisKelamin: ps.jenisKelamin,
          tempatLahir: ps.tempatLahir,
          tanggalLahir: ps.tanggalLahir,

          /* ================= INFORMASI MAGANG (INI YANG KURANG) ================= */
          tanggalMulaiMagang: ps.tanggalMulaiMagang,
          tanggalSelesaiMagang: ps.tanggalSelesaiMagang,

          /* ================= ALAMAT ================= */
          provinsi: ps.provinsi,
          kota: ps.kota,
          kecamatan: ps.kecamatan,
          kelurahan: ps.kelurahan,
          alamatLengkap: ps.alamatLengkap,

          /* ================= MENTOR ================= */
          mentor: ps.mentor
            ? {
                name: ps.mentor.name,
                email: ps.mentor.email,
                posisiMentor: ps.mentor.posisiMentor,
              }
            : null,
        })),
    );

    res.json(peserta);
  } catch (err) {
    console.error("[GET PESERTA BIMBINGAN]", err);
    res.status(500).json({
      message: "Gagal memuat peserta bimbingan",
    });
  }
};

/* ================= GET DETAIL PESERTA ================= */
export const getPesertaDetail = async (req: Request, res: Response) => {
  try {
    const { pesertaId } = req.params;

    const pendaftaran = await Pendaftaran.findOne({
      "peserta._id": pesertaId,
    });

    if (!pendaftaran) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    const peserta = pendaftaran.peserta.find(
      (p: any) => p._id.toString() === pesertaId,
    );

    res.json(peserta);
  } catch (err) {
    console.error("[GET PESERTA DETAIL]", err);
    res.status(500).json({
      message: "Gagal memuat detail peserta",
    });
  }
};

// Di MentorController.js
export const getLogbookPesertaByDate = async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.params;

    console.log("Mencari logbook untuk:", { userId, date });

    // Validasi input
    if (!userId || userId === "undefined") {
      return res.status(400).json({
        message: "User ID tidak valid",
      });
    }

    // Cari user berdasarkan userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    // Cari logbook berdasarkan user._id (ObjectId) dan date
    const logbook = await Logbook.findOne({
      user: user._id,
      date,
    }).populate("user", "name email");

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook tidak ditemukan",
      });
    }

    res.json(logbook);
  } catch (err) {
    console.error("[GET LOGBOOK BY DATE]", err);
    res.status(500).json({
      message: "Gagal memuat logbook",
    });
  }
};
