// models/LaporanBulanan.ts
import mongoose from "mongoose";

const LaporanBulananSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String, // YYYY-MM
      required: true,
    },

    ringkasan: { type: String, required: true },
    pencapaian: { type: String, required: true },
    kendala: { type: String, required: true },
    rencana: { type: String, required: true },

    /* ===== STATUS LAPORAN ===== */
    status: {
      type: String,
      enum: ["Menunggu", "Disetujui", "Ditolak", "Perbaiki"],
      default: "Menunggu",
    },

    /* ===== KOMENTAR MENTOR ===== */
    mentorNote: {
      type: String,
      default: "",
    },

    /* ===== STATUS REVISI ===== */
    isRevisi: {
      type: Boolean,
      default: false,
    },

    revisiNote: {
      type: String,
      default: "",
    },

    revisiRequestedAt: {
      type: Date,
    },

    revisiCompleted: {
      type: Boolean,
      default: true,
    },

    /* ===== APPROVAL MENTOR ===== */
    approvedByMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

/* 🔒 1 USER 1 LAPORAN PER BULAN */
LaporanBulananSchema.index({ user: 1, month: 1 }, { unique: true });

export default mongoose.model("LaporanBulanan", LaporanBulananSchema);
