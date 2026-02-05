import mongoose, { Schema, Document } from "mongoose";

export interface IFormasi extends Document {
  title: string;
  divisi: string;
  kuota: number;
  jurusan: string[];
  kode: string; // Identifikasi unik untuk fungsi
  isActive: boolean;
}

const FormasiSchema = new Schema<IFormasi>(
  {
    title: {
      type: String,
      required: true,
    },
    divisi: {
      type: String,
      required: true,
    },
    kuota: {
      type: Number,
      required: true,
      min: 0,
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
