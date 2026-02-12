// models/LaporanAhir.ts
import mongoose from "mongoose";

const PenilaianSchema = new mongoose.Schema({
  kehadiranDisiplin: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
  sikapPerilaku: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
  kemampuanKomunikasi: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
  inisiatifTanggungJawab: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
  kemampuanAdaptasi: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
  pengetahuanTeknis: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
  produktivitasKetepatanWaktu: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
  kerjaSamaTim: {
    type: String,
    enum: ["sangat buruk", "buruk", "baik", "sangat baik"],
    default: null,
  },
});

const LaporanAkhirSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 🔒 1 user hanya 1 laporan akhir
    },

    // 🔥 UBAH: dari field-field teks menjadi file PDF
    filePdf: {
      type: String,
      required: true, // path file PDF
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },

    /* ===== STATUS LAPORAN ===== */
    status: {
      type: String,
      enum: ["Menunggu", "Disetujui", "Ditolak"],
      default: "Menunggu",
    },

    /* ===== APPROVAL MENTOR ===== */
    approvedByMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    mentorNote: {
      type: String,
      default: "",
    },

    approvedAt: {
      type: Date,
    },

    /* ===== PENILAIAN MENTOR (BARU) ===== */
    penilaian: {
      type: PenilaianSchema,
      default: () => ({}),
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model("LaporanAkhir", LaporanAkhirSchema);
