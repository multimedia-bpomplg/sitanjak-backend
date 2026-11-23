import mongoose from "mongoose";

const EvaluasiMagangSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    fasilitator: {
      nama: { type: String, required: true, trim: true },
      judulMateri: { type: String, default: "", trim: true },
      skor1: { type: Number, min: 1, max: 5, required: true },
      skor2: { type: Number, min: 1, max: 5, required: true },
      skor3: { type: Number, min: 1, max: 5, required: true },
      skor4: { type: Number, min: 1, max: 5, required: true },
      skor5: { type: Number, min: 1, max: 5, required: true },
      adaSaran: { type: String, enum: ["Ya", "Tidak"], default: "Ya" },
      saran: { type: String, default: "", trim: true },
    },
    penyelenggara: {
      skor1: { type: Number, min: 1, max: 5, required: true },
      skor2: { type: Number, min: 1, max: 5, required: true },
      skor3: { type: Number, min: 1, max: 5, required: true },
      skor4: { type: Number, min: 1, max: 5, required: true },
      skor5: { type: Number, min: 1, max: 5, required: true },
      bermanfaat: { type: String, enum: ["Ya", "Tidak"], default: "Ya" },
      alasanBermanfaat: { type: String, default: "", trim: true },
      adaMasukan: { type: String, enum: ["Ya", "Tidak"], default: "Ya" },
      masukan: { type: String, default: "", trim: true },
    },
    suratPernyataan: {
      nama: { type: String, required: true, trim: true },
      nim: { type: String, required: true, trim: true },
      programPendidikan: { type: String, required: true, trim: true },
      universitas: { type: String, required: true, trim: true },
      tanggalSurat: { type: String, required: true, trim: true },
      ttdImage: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["Menunggu", "Revisi", "Disetujui"],
      default: "Menunggu",
    },
    mentorNote: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedByName: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model("EvaluasiMagang", EvaluasiMagangSchema);
