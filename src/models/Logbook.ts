// models/Logbook.ts
import mongoose from "mongoose";

const LogbookSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },

    status: {
      type: String,
      enum: ["hadir", "tidak_hadir_keterangan", "tidak_hadir_tanpa_keterangan"],
      required: true,
    },

    judul: String,
    pengalaman: String,
    kendala: String,
    keterangan: String,

    files: [String], // foto

    pdfFile: {
      type: String,
      default: null,
    },

    // 🔥 STATUS PERSETUJUAN MENTOR
    approvalStatus: {
      type: String,
      enum: ["menunggu", "disetujui", "ditolak", "revisi"],
      default: "menunggu",
    },

    approvedByMentor: {
      type: Boolean,
      default: false,
    },

    mentorNote: {
      type: String,
      default: "",
    },

    // 🔥 CATATAN REVISI (KHUSUS UNTUK STATUS REVISI)
    revisionNote: {
      type: String,
      default: "",
    },

    // 🔥 TANGGAL REVISI DIMINTA
    revisionRequestedAt: {
      type: Date,
    },

    // 🔥 TANGGAL APPROVAL
    approvedAt: {
      type: Date,
    },

    // 🔥 MENTOR YANG MENYETUJUI
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isFinalized: {
      type: Boolean,
      default: false,
    },

    finalizedAt: {
      type: Date,
    },
  },

  { timestamps: true },
);

/* 🔒 1 USER 1 LOGBOOK PER TANGGAL */
LogbookSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("Logbook", LogbookSchema);
