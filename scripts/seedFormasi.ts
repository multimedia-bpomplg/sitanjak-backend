/**
 * Script Seeder Formasi
 * Jalankan: npm run seed:formasi
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

import Formasi from "../src//models/Formasi";

dotenv.config();

// ============================
// DATA FORMASI
// ============================
const formasiData = [
  {
    title: "Bagian Tata Usaha",
    kode: "TU",
    kuota: 5,
  },
  {
    title: "Fungsi Penindakan",
    kode: "PEN",
    kuota: 5,
  },
  {
    title: "Fungsi Pengujian",
    kode: "UJI",
    kuota: 5,
  },
  {
    title: "Fungsi Pemeriksaan (Inspeksi dan sertifikasi)",
    kode: "PEM",
    kuota: 5,
  },
  {
    title: "Fungsi Informasi dan Komunikasi",
    kode: "INFO",
    kuota: 5,
  },
];

// ============================
// CONNECT DB
// ============================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);

    console.log("✅ MongoDB Connected (Seeder)");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  }
};

// ============================
// SEEDER
// ============================
const seedFormasi = async () => {
  try {
    await connectDB();

    console.log("🗑 Menghapus data lama...");

    await Formasi.deleteMany({});

    console.log("📥 Memasukkan data formasi...");

    await Formasi.insertMany(formasiData);

    console.log("✅ Seeder Formasi berhasil!");

    process.exit();
  } catch (err) {
    console.error("❌ Seeder gagal:", err);
    process.exit(1);
  }
};

// ============================
// RUN
// ============================
seedFormasi();
