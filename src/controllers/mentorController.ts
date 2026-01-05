import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";
import { sendEmail } from "../utils/sendEmail";
import { mentorEmailTemplate } from "../utils/mentorEmailTemplate";

/* ================= BUAT AKUN MENTOR + EMAIL ================= */
export const buatMentor = async (req: Request, res: Response) => {
  try {
    const { name, email, password, pesertaBimbingan } = req.body;
    // pesertaBimbingan: string[] (nama peserta)

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

    /* ROLE MENTOR */
    const mentorRole = await Role.findOne({ name: "mentor" });
    if (!mentorRole) {
      return res.status(500).json({
        message: "Role mentor belum tersedia",
      });
    }

    /* HASH PASSWORD */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* CREATE USER */
    const mentor = await User.create({
      name,
      email,
      password: hashedPassword,
      roles: [mentorRole._id],
      status: "Aktif",
      pesertaBimbingan: pesertaBimbingan || [], // optional
    });

    /* KIRIM EMAIL KE MENTOR */
    await sendEmail({
      to: email,
      subject: "Akun Mentor Magang Telah Dibuat",
      html: mentorEmailTemplate({
        name,
        email,
        password, // ⚠️ hanya dikirim via email
        role: "Mentor",
        pesertaBimbingan: pesertaBimbingan || [],
      }),
    });

    res.status(201).json({
      message: "Akun mentor berhasil dibuat & email terkirim",
      mentor: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        status: mentor.status,
      },
    });
  } catch (error) {
    console.error("[BUAT MENTOR ERROR]", error);
    res.status(500).json({
      message: "Gagal membuat akun mentor",
    });
  }
};

/* ================= GET DATA MENTOR ================= */
export const getMentor = async (req: Request, res: Response) => {
  try {
    const mentorRole = await Role.findOne({ name: "mentor" });
    if (!mentorRole) return res.json([]);

    const data = await User.find({
      roles: mentorRole._id,
    })
      .select("name email status createdAt")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    console.error("[GET MENTOR ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil data mentor" });
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
