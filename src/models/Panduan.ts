import mongoose, { Schema, Document, Types } from "mongoose";

export type PanduanTarget = "peserta" | "mentor" | "admin" | "pendaftaran";

export interface IPanduan extends Document {
  target: PanduanTarget;
  title: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  uploadedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PanduanSchema = new Schema<IPanduan>(
  {
    target: {
      type: String,
      enum: ["peserta", "mentor", "admin", "pendaftaran"],
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Panduan ||
  mongoose.model<IPanduan>("Panduan", PanduanSchema);
