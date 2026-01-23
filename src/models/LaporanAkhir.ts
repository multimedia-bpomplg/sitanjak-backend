// models/LaporanAkhir.ts
import mongoose from "mongoose";

const LaporanAkhirSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 🔒 1 user hanya 1 laporan akhir
    },

    judul: { type: String, required: true },
    ringkasan: { type: String, required: true },
    hasil: { type: String, required: true },
    kendala: { type: String, required: true },
    kesimpulan: { type: String, required: true },
    saran: { type: String },

    /* ===== STATUS LAPORAN ===== */
    status: {
      type: String,
      enum: ["Menunggu", "Disetujui", "Ditolak", "Revisi"],
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
  },
  { timestamps: true },
);

export default mongoose.model("LaporanAkhir", LaporanAkhirSchema);
