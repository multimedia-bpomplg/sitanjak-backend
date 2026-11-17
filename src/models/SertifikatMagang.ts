import mongoose, { Schema, Document } from "mongoose";

export interface ISertifikatMagang extends Document {
  email: string;
  nama: string;
  nomorSertifikat?: string;
  file: string;
  tanggalKirim: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SertifikatMagangSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    nama: {
      type: String,
      required: true,
    },
    nomorSertifikat: {
      type: String,
      default: "",
      trim: true,
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

export default mongoose.model<ISertifikatMagang>(
  "SertifikatMagang",
  SertifikatMagangSchema,
);
