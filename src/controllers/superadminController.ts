import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";
import Pendaftaran from "../models/pendaftaran"; // ✅ INI YANG KURANG
import { isStrongPassword } from "../utils/generatePassword";
import { sendEmail } from "../utils/sendEmail";
import { pesertaEmailTemplate } from "../utils/emailTemplate";
import jwt from "jsonwebtoken";

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

/* ================= UPDATE POSISI PESERTA ================= */
export const updatePosisiPeserta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { indexPeserta, posisi } = req.body;

    console.log("UPDATE POSISI MASUK:", { id, indexPeserta, posisi });

    if (indexPeserta === undefined || !posisi) {
      return res.status(400).json({
        message: "indexPeserta dan posisi wajib diisi",
      });
    }

    const index = Number(indexPeserta);
    if (Number.isNaN(index)) {
      return res.status(400).json({
        message: "indexPeserta harus number",
      });
    }

    const pendaftaran = await Pendaftaran.findById(id);
    if (!pendaftaran) {
      return res.status(404).json({
        message: "Pendaftaran tidak ditemukan",
      });
    }

    if (!pendaftaran.peserta[index]) {
      return res.status(400).json({
        message: "Index peserta tidak valid",
      });
    }

    // ✅ UPDATE POSISI
    pendaftaran.peserta[index].posisi = posisi;
    await pendaftaran.save();

    return res.status(200).json({
      message: "Posisi magang berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("[UPDATE POSISI ERROR]", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= UPDATE STATUS MAGANG ================= */
export const updateStatusMagang = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { indexPeserta, statusMagang } = req.body;

    if (indexPeserta === undefined || !statusMagang) {
      return res.status(400).json({
        message: "indexPeserta dan statusMagang wajib diisi",
      });
    }

    const index = Number(indexPeserta);

    const pendaftaran = await Pendaftaran.findById(id);

    if (!pendaftaran) {
      return res.status(404).json({
        message: "Pendaftaran tidak ditemukan",
      });
    }

    if (!pendaftaran.peserta[index]) {
      return res.status(400).json({
        message: "Index peserta tidak valid",
      });
    }

    // ✅ UPDATE STATUS MAGANG
    pendaftaran.peserta[index].statusMagang = statusMagang;

    await pendaftaran.save();

    res.status(200).json({
      message: "Status magang berhasil diperbarui",
      data: pendaftaran,
    });
  } catch (err) {
    console.error("[UPDATE STATUS MAGANG]", err);
    res.status(500).json({
      message: "Gagal update status magang",
    });
  }
};

/* ================= CORE SUPERADMIN LOGIN ================= */
export const superadminCoreLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email dan password wajib diisi",
      });
    }

    const user = await User.findOne({ email }).populate("roles");

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    const roleNames = user.roles.map((r: any) => r.name);

    /* 🚨 HARD VALIDATION */
    if (!roleNames.includes("superadmin")) {
      return res.status(403).json({
        message: "Akses hanya untuk Superadmin",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Password salah",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        roles: roleNames,
        coreAccess: true,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      message: "Login core berhasil",
      token,
      roles: roleNames,
    });
  } catch (error) {
    console.error("[CORE LOGIN ERROR]", error);
    return res.status(500).json({
      message: "Gagal login core",
    });
  }
};
