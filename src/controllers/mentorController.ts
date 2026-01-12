import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";
import { sendEmail } from "../utils/sendEmail";
import { mentorEmailTemplate } from "../utils/mentorEmailTemplate";

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
      "name email status posisiMentor"
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
