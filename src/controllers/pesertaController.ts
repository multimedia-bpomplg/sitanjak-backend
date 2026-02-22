import { Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { sendEmail } from "../utils/sendEmail";
import { passwordChangedEmail } from "../utils/ALERTEmail";
import Pendaftaran from "../models/pendaftaran";

/* ======================================================
   GET DATA PESERTA LOGIN (PROFILE PESERTA)
   - Digunakan di dashboard peserta
   - Mengambil data user + data pendaftaran
====================================================== */
export const getPesertaMe = async (req: any, res: Response) => {
  try {
    // ID user diambil dari token JWT (authMiddleware)
    const userId = req.user.id;

    // Ambil data user (tanpa password)
    const user = await User.findById(userId).select(
      "name email roles posisiMagang",
    );

    // Ambil data pendaftaran + mentor (jika ada)
    const pendaftaran = await Pendaftaran.findOne({ user: userId }).populate(
      "mentor",
      "name email posisiMentor",
    );

    // Kirim response ke frontend
    res.json({
      user,
      pendaftaran,
    });
  } catch (err) {
    // Error server
    res.status(500).json({ message: "Gagal mengambil data peserta" });
  }
};

/* ======================================================
   GANTI PASSWORD PESERTA
   - Memvalidasi password lama
   - Menyimpan password baru (hash bcrypt)
   - Mengirim email notifikasi (opsional & aman)
====================================================== */
export const gantiPasswordPeserta = async (req: any, res: Response) => {
  try {
    // Ambil ID user dari token JWT
    const userId = req.user.id;

    // Ambil data dari body request
    const { passwordLama, passwordBaru, konfirmasiPassword } = req.body;

    /* ================= VALIDASI INPUT ================= */

    // Semua field wajib diisi
    if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
      return res.status(400).json({ message: "Semua field wajib diisi" });
    }

    // Password baru & konfirmasi harus sama
    if (passwordBaru !== konfirmasiPassword) {
      return res
        .status(400)
        .json({ message: "Konfirmasi password tidak cocok" });
    }

    // Minimal panjang password
    if (passwordBaru.length < 8) {
      return res.status(400).json({ message: "Password minimal 8 karakter" });
    }

    /* ================= AMBIL USER ================= */

    // Cari user berdasarkan ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    /* ================= CEK PASSWORD LAMA ================= */

    // Cocokkan password lama dengan hash di database
    const isMatch = await bcrypt.compare(passwordLama, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password lama salah" });
    }

    /* ================= SIMPAN PASSWORD BARU ================= */

    // Hash password baru
    user.password = await bcrypt.hash(passwordBaru, 10);

    // Catat waktu perubahan password (opsional untuk security)
    user.passwordChangedAt = new Date();

    // Simpan ke database
    await user.save();

    /* ================= KIRIM EMAIL NOTIFIKASI =================
       - Email bersifat opsional
       - Jika gagal, TIDAK membatalkan proses utama
    =========================================================== */
    if (user.email && user.email.includes("@")) {
      try {
        // Generate konten email
        const emailContent = passwordChangedEmail(user.name, user.email);

        // Kirim email
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailError) {
        // Error email hanya di-log
        console.error("Gagal kirim email notifikasi:", emailError);
        // ❗ Sengaja tidak throw error
      }
    }

    /* ================= RESPONSE SUKSES ================= */

    return res.json({
      message: "Password berhasil diganti",
    });
  } catch (error) {
    // Error tak terduga
    console.error("Ganti password error:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};
