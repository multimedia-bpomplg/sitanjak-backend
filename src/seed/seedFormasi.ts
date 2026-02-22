import mongoose from "mongoose";
import dotenv from "dotenv";
import Formasi from "../models/Formasi";

dotenv.config();

const formasiData = [
  {
    title: "Fungsi Penindakan",
    divisi: "Laboratorium Pengujian",
    kuotaTotal: 5,
    kuotaTersedia: 5,
    kuotaTerisi: 0,
    jurusan: "Hukum, dan lain-lain",
    aktif: true,
  },
  {
    title: "Fungsi Pengujian",
    divisi: "Tata Usaha",
    kuotaTotal: 5,
    kuotaTersedia: 5,
    kuotaTerisi: 0,
    jurusan: "Kimia, Fisika, dan lain-lain",
    aktif: true,
  },
  {
    title: "Fungsi Pemeriksaan (Inspeksi dan sertifikasi)",
    divisi: "Sistem Informasi",
    kuotaTotal: 5,
    kuotaTersedia: 5,
    kuotaTerisi: 0,
    jurusan: "Sistem Informasi, Sistem Komputer, dan lain-lain",
    aktif: true,
  },
  {
    title: "Fungsi Informasi dan Komunikasi",
    divisi: "Informasi & Komunikasi",
    kuotaTotal: 5,
    kuotaTersedia: 5,
    kuotaTerisi: 0,
    jurusan: "Ilmu Komunikasi, dan lain-lain",
    aktif: true,
  },
  {
    title: "Bagian Tata Usaha",
    divisi: "Tata Usaha",
    kuotaTotal: 5,
    kuotaTersedia: 5,
    kuotaTerisi: 0,
    jurusan: "Administrasi, Akuntansi, dan lain-lain",
    aktif: true,
  },
];

async function seedFormasi() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bpom",
    );

    console.log("✅ Connected to MongoDB");

    await Formasi.deleteMany({});
    console.log("ℹ️ Data lama dihapus");

    await Formasi.insertMany(formasiData);
    console.log("✅ Formasi berhasil di-seed!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding formasi:", error);
    process.exit(1);
  }
}

seedFormasi();
