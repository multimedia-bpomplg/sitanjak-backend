import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";
import { isStrongPassword } from "../utils/generatePassword";
import { sendEmail } from "../utils/sendEmail";
import { pesertaEmailTemplate } from "../utils/emailTemplate";

/* ================= CREATE AKUN PESERTA + EMAIL ================= */
export const buatAkunPeserta = async (req: Request, res: Response) => {
  try {
    const { name, email, password, periode } = req.body;

    /* VALIDASI */
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nama, email, dan password wajib diisi",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password minimal 8 karakter (huruf & angka)",
      });
    }

    /* CEK EMAIL */
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({
        message: "Email sudah terdaftar",
      });
    }

    /* ROLE PESERTA */
    const rolePeserta = await Role.findOne({ name: "peserta" });
    if (!rolePeserta) {
      return res.status(500).json({
        message: "Role peserta belum tersedia",
      });
    }

    /* HASH PASSWORD */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* CREATE USER */
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      roles: [rolePeserta._id],
      status: "Aktif",
      periode: periode || new Date().getFullYear().toString(),
    });

    /* KIRIM EMAIL */
    await sendEmail({
      to: email,
      subject: "Akun Magang Anda Telah Dibuat",
      html: pesertaEmailTemplate({
        name,
        email,
        password, // ⚠️ password asli hanya dikirim via email
      }),
    });

    res.status(201).json({
      message: "Akun peserta berhasil dibuat & email terkirim",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        periode: user.periode,
      },
    });
  } catch (error: any) {
    console.error("[CREATE PESERTA + EMAIL]", error);
    res.status(500).json({
      message: "Gagal membuat akun peserta",
    });
  }
};

/* ================= GET DATA PESERTA ================= */
export const getPeserta = async (req: Request, res: Response) => {
  try {
    const rolePeserta = await Role.findOne({ name: "peserta" });
    if (!rolePeserta) {
      return res.status(500).json({
        message: "Role peserta belum tersedia",
      });
    }

    const peserta = await User.find({
      roles: rolePeserta._id,
    })
      .select("name email status periode createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(peserta);
  } catch (error) {
    console.error("[GET PESERTA]", error);
    res.status(500).json({
      message: "Gagal mengambil data peserta",
    });
  }
};

/* ================= NONAKTIFKAN PESERTA ================= */
export const nonaktifkanPeserta = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Nonaktif",
    });

    res.json({ message: "Akun berhasil dinonaktifkan" });
  } catch (error) {
    res.status(500).json({ message: "Gagal menonaktifkan akun" });
  }
};

/* ================= AKTIFKAN PESERTA ================= */
export const aktifkanPeserta = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Aktif",
    });

    res.json({ message: "Akun berhasil diaktifkan" });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengaktifkan akun" });
  }
};
