import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";

/* ================= BUAT ADMIN ================= */
export const buatAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    const roleAdmin = await Role.findOne({ name: "admin" });
    if (!roleAdmin) {
      return res.status(500).json({ message: "Role admin tidak ditemukan" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      roles: [roleAdmin._id],
    });

    res.json({ message: "Akun admin berhasil dibuat" });
  } catch (error) {
    console.error("[BUAT ADMIN ERROR]", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

/* ================= GET ADMIN ================= */
export const getAdmin = async (_req: Request, res: Response) => {
  try {
    const roleAdmin = await Role.findOne({ name: "admin" });
    if (!roleAdmin) return res.json([]);

    const admin = await User.find({ roles: roleAdmin._id }).select(
      "name email createdAt"
    );

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data admin" });
  }
};
