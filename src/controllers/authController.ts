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

    const token = signAuthToken(user, roleNames, { jurusan, kategoriMagang });

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

function signAuthToken(
  user: any,
  roleNames: string[],
  meta: { jurusan?: string; kategoriMagang?: string },
): string {
  const tokenExpiresIn = roleNames.includes("peserta") ? "7d" : "1d";
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      roles: roleNames,
      status: user.status,
      isSuperAccess: user.isSuperAccess || false,
      jurusan: meta.jurusan,
      kategoriMagang: meta.kategoriMagang,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: tokenExpiresIn },
  );
}

/* ===================== GET / REFRESH SESSION ===================== */
export const getAuthSession = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).populate("roles");
    if (!user) {
      return res.status(404).json({ message: "Akun tidak ditemukan" });
    }

    if (user.status === "Nonaktif") {
      return res.status(403).json({
        message: "Akun Anda Nonaktif, silakan hubungi Admin",
      });
    }

    const roleNames = Array.isArray(user.roles)
      ? user.roles.map((r: any) => r?.name).filter(Boolean)
      : [];
    const { jurusan, kategoriMagang } = await resolveUserMagangMeta(
      user,
      roleNames,
    );

    const token = signAuthToken(user, roleNames, { jurusan, kategoriMagang });

    return res.json({
      token,
      roles: roleNames,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: roleNames,
        status: user.status,
        isSuperAccess: Boolean(user.isSuperAccess),
        posisiMentor: user.posisiMentor || "",
        nip: user.nip || "",
        wa: user.wa || "",
      },
    });
  } catch (error) {
    console.error("[GET AUTH SESSION ERROR]", error);
    return res.status(500).json({ message: "Gagal menyinkronkan sesi" });
  }
};
