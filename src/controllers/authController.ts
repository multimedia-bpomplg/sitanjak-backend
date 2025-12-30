import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Role from "../models/Role";
import { verifyCaptcha } from "../utils/verifyCaptcha";

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await delay(1200);
      return res.status(400).json({ message: "Password salah" });
    }

    const roleNames = user.roles.map((r: any) => r.name);

    await delay(1000);

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        roles: roleNames,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      token,
      roles: roleNames,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
