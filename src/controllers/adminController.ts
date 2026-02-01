// controllers/AdminController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
      isSuperAccess: false, // Default false
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
        isSuperAccess: admin.isSuperAccess,
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
    }).select("name email status isSuperAccess createdAt");

    res.json(admin);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data admin",
    });
  }
};

/* ================= NONAKTIFKAN ================= */
export const nonaktifkanAdmin = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Nonaktif",
    });

    res.json({ message: "Akun admin berhasil dinonaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal menonaktifkan akun admin" });
  }
};

/* ================= AKTIFKAN ================= */
export const aktifkanAdmin = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Aktif",
    });

    res.json({ message: "Akun admin berhasil diaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal mengaktifkan akun admin" });
  }
};

/* ================= SET SUPER ACCESS ================= */
export const setSuperAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isSuperAccess } = req.body;

    const admin = await User.findByIdAndUpdate(
      id,
      { isSuperAccess },
      { new: true },
    ).select("name email status isSuperAccess");

    if (!admin) {
      return res.status(404).json({
        message: "Admin tidak ditemukan",
      });
    }

    // GENERATE TOKEN BARU JIKA PERLU
    if (isSuperAccess) {
      const token = jwt.sign(
        {
          id: admin._id,
          email: admin.email,
          roles: ["admin"],
          isSuperAccess: true,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" },
      );

      res.json({
        message: `Super access ${isSuperAccess ? "diaktifkan" : "dinonaktifkan"}`,
        admin,
        newToken: token,
      });
    } else {
      res.json({
        message: `Super access ${isSuperAccess ? "diaktifkan" : "dinonaktifkan"}`,
        admin,
      });
    }
  } catch (error) {
    console.error("[SET SUPER ACCESS ERROR]", error);
    res.status(500).json({
      message: "Gagal mengatur super access",
    });
  }
};
