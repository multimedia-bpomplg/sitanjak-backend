import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User";
import ResetPassword from "../models/ResetPassword";
import { SendLupaPassword } from "../utils/SendLupaPassword";

/* ======================================================
   REQUEST OTP
====================================================== */
export const requestLupaPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email tidak ditemukan" });
    }

    // Generate OTP 6 digit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Hapus OTP lama
    await ResetPassword.deleteMany({ userId: user._id });

    // Simpan OTP baru
    await ResetPassword.create({
      userId: user._id,
      otpHash,
      expiredAt: new Date(Date.now() + 10 * 60 * 1000), // 10 menit
    });

    // Kirim email
    await SendLupaPassword(user.email, otp);

    return res.json({
      message: "Kode OTP berhasil dikirim ke email",
    });
  } catch (error) {
    console.error("ERROR REQUEST OTP:", error);
    return res.status(500).json({
      message: "Gagal mengirim OTP",
    });
  }
};

/* ======================================================
   VERIFY OTP (TANPA RESET PASSWORD)
====================================================== */
export const verifyOtpLupaPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email dan OTP wajib diisi" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const reset = await ResetPassword.findOne({ userId: user._id });
    if (!reset) {
      return res.status(400).json({ message: "OTP tidak valid" });
    }

    if (reset.expiredAt < new Date()) {
      return res.status(400).json({ message: "OTP sudah kadaluarsa" });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (otpHash !== reset.otpHash) {
      return res.status(400).json({ message: "Kode OTP salah" });
    }

    return res.json({
      message: "OTP valid",
    });
  } catch (error) {
    console.error("ERROR VERIFY OTP:", error);
    return res.status(500).json({
      message: "Gagal verifikasi OTP",
    });
  }
};

/* ======================================================
   RESET PASSWORD (SETELAH OTP VALID)
====================================================== */
export const resetPasswordLupa = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const reset = await ResetPassword.findOne({ userId: user._id });
    if (!reset) {
      return res.status(400).json({ message: "OTP tidak valid" });
    }

    if (reset.expiredAt < new Date()) {
      return res.status(400).json({ message: "OTP sudah kadaluarsa" });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (otpHash !== reset.otpHash) {
      return res.status(400).json({ message: "Kode OTP salah" });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Hapus OTP setelah sukses
    await ResetPassword.deleteMany({ userId: user._id });

    return res.json({
      message: "Password berhasil diubah",
    });
  } catch (error) {
    console.error("ERROR RESET PASSWORD:", error);
    return res.status(500).json({
      message: "Gagal reset password",
    });
  }
};
