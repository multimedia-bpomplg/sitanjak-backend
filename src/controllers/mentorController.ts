import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";

export const buatMentor = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // 🔑 Ambil role mentor
    const mentorRole = await Role.findOne({ name: "mentor" });
    if (!mentorRole) {
      return res.status(500).json({ message: "Role mentor belum tersedia" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      roles: [mentorRole._id], 
      status: "Aktif",        
    });

    res.json({ message: "Akun mentor berhasil dibuat" });
  } catch (error) {
    console.error("[BUAT MENTOR ERROR]", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

export const getMentor = async (req: Request, res: Response) => {
  try {
    const mentorRole = await Role.findOne({ name: "mentor" });
    if (!mentorRole) {
      return res.json([]);
    }

    const data = await User.find({
      roles: mentorRole._id,
    }).select("name email status createdAt");

    res.json(data);
  } catch (error) {
    console.error("[GET MENTOR ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil data mentor" });
  }
};
