import mongoose, { Schema, Document } from "mongoose";

export interface ISuratSelesaiMagang extends Document {
  email: string;
  nama: string;
  file: string;
  tanggalKirim: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SuratSelesaiMagangSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    nama: {
      type: String,
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
    tanggalKirim: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model<ISuratSelesaiMagang>(
  "SuratSelesaiMagang",
  SuratSelesaiMagangSchema,
);
