import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";
import { sendEmail } from "../utils/sendEmail";
import { adminEmailTemplate } from "../utils/adminEmailTemplate";

/* ================= BUAT ADMIN + EMAIL ================= */
export const buatAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    /* VALIDASI */
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nama, email, dan password wajib diisi",
      });
    }

    /* CEK EMAIL */
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({
        message: "Email sudah terdaftar",
      });
    }

    /* ROLE ADMIN */
    const roleAdmin = await Role.findOne({ name: "admin" });
    if (!roleAdmin) {
      return res.status(500).json({
        message: "Role admin tidak ditemukan",
      });
    }

    /* HASH PASSWORD */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* CREATE USER */
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      roles: [roleAdmin._id],
      status: "Aktif",
    });

    /* KIRIM EMAIL */
    await sendEmail({
      to: email,
      subject: "Akun Admin Sistem Magang BPOM",
      html: adminEmailTemplate({
        name,
        email,
        password, // ⚠️ hanya dikirim via email
      }),
    });

    res.status(201).json({
      message: "Akun admin berhasil dibuat & email terkirim",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
      },
    });
  } catch (error) {
    console.error("[BUAT ADMIN ERROR]", error);
    res.status(500).json({
      message: "Gagal membuat akun admin",
    });
  }
};

/* ================= GET ADMIN ================= */
export const getAdmin = async (_req: Request, res: Response) => {
  try {
    const roleAdmin = await Role.findOne({ name: "admin" });
    if (!roleAdmin) return res.json([]);

    const admin = await User.find({
      roles: roleAdmin._id,
    }).select("name email status createdAt");

    res.json(admin);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data admin",
    });
  }
};
