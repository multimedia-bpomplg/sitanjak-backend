import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Role from "../models/Role";
import { verifyCaptcha } from "../utils/verifyCaptcha";
import { resolveUserMagangMeta } from "../utils/pesertaKategori";

/* ===================== HELPER ===================== */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ===================== REGISTER ===================== */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const roles = await Role.find({
      name: { $in: role ? [role] : ["peserta"] },
    });

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      roles: roles.map((r) => r._id),
    });

    res.status(201).json({
      message: "User berhasil dibuat",
      userId: user._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===================== LOGIN ===================== */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha wajib diisi" });
    }

    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(403).json({ message: "Captcha tidak valid" });
    }

    const user = await User.findOne({ email }).populate("roles");
    if (!user) {
      await delay(1200);
      return res.status(400).json({ message: "Email tidak ditemukan" });
    }

    // CEK STATUS AKUN
    if (user.status === "Nonaktif") {
      await delay(1200);
      return res.status(403).json({
        message: "Akun Anda Nonaktif, silakan hubungi Admin",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await delay(1200);
      return res.status(400).json({ message: "Password salah" });
    }

    const roleNames = user.roles.map((r: any) => r.name);
    const { jurusan, kategoriMagang } = await resolveUserMagangMeta(
      user,
      roleNames,
    );

    await delay(1000);

    const tokenExpiresIn = roleNames.includes("peserta") ? "7d" : "1d";

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: roleNames,
        status: user.status,
        isSuperAccess: user.isSuperAccess || false,
        jurusan,
        kategoriMagang,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: tokenExpiresIn },
    );

    res.json({
      token,
      roles: roleNames,
      status: user.status,
      isSuperAccess: user.isSuperAccess || false,
      jurusan,
      kategoriMagang,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
