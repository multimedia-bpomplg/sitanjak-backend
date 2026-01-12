import mongoose from "mongoose";

const LaporanBulananSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String, // format: YYYY-MM
      required: true,
    },

    ringkasan: {
      type: String,
      required: true,
    },

    pencapaian: {
      type: String,
      required: true,
    },

    kendala: {
      type: String,
      required: true,
    },

    rencana: {
      type: String,
      required: true,
    },

    // 🔔 approval mentor (future-ready)
    approvedByMentor: {
      type: Boolean,
      default: false,
    },

    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

/* 🔒 1 USER 1 LAPORAN PER BULAN */
LaporanBulananSchema.index({ user: 1, month: 1 }, { unique: true });

export default mongoose.model("LaporanBulanan", LaporanBulananSchema);
