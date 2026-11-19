import mongoose, { Schema, Document, Types } from "mongoose";

export interface IHeroSetting extends Document {
  key: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const HeroSettingSchema = new Schema<IHeroSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "landing-hero",
    },
    fileName: {
      type: String,
      default: "",
    },
    originalName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.HeroSetting ||
  mongoose.model<IHeroSetting>("HeroSetting", HeroSettingSchema);
