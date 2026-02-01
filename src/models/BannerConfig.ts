// models/BannerConfig.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IBannerConfig extends Document {
  type: "popup" | "topbar" | "sidebar";
  title: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  showDelay: number;
  hideAfterDays: number;
  startDate: Date;
  endDate: Date;
  updatedAt: Date;
}

const BannerConfigSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["popup", "topbar", "sidebar"],
      default: "popup",
    },
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    buttonText: {
      type: String,
      default: "Pelajari Selengkapnya",
    },
    buttonLink: {
      type: String,
      default: "/pendaftaran",
    },
    backgroundColor: {
      type: String,
      default: "#FFFFFF",
    },
    textColor: {
      type: String,
      default: "#000000",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    showDelay: {
      type: Number,
      default: 1500,
    },
    hideAfterDays: {
      type: Number,
      default: 1,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.BannerConfig ||
  mongoose.model<IBannerConfig>("BannerConfig", BannerConfigSchema);
