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

    /* ===== APPROVAL MENTOR ===== */
    approvedByMentor: {
      type: Boolean,
      default: false,
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
