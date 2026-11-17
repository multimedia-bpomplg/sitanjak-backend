import mongoose, { Schema, Document } from "mongoose";

export interface IKuotaBulanan {
  bulan: string; // Format YYYY-MM, contoh: "2026-11"
  kuota: number;
}

export interface IFormasi extends Document {
  title: string;
  divisi: string;
  kuota: number;
  kuotaBulanan?: IKuotaBulanan[];
  jurusan: string[];
  kode: string; // Identifikasi unik untuk fungsi
  isActive: boolean;
}

const KuotaBulananSchema = new Schema<IKuotaBulanan>(
  {
    bulan: {
      type: String,
      required: true,
    },
    kuota: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const FormasiSchema = new Schema<IFormasi>(
  {
    title: {
      type: String,
      required: true,
    },

    kuota: {
      type: Number,
      required: true,
      min: 0,
    },
    kuotaBulanan: {
      type: [KuotaBulananSchema],
      default: [],
    },
    jurusan: {
      type: [String],
      required: true,
    },
    kode: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Formasi ||
  mongoose.model<IFormasi>("Formasi", FormasiSchema);
