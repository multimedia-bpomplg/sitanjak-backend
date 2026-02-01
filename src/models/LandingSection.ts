// models/LandingSection.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILandingSection extends Document {
  sectionType:
    | "hero"
    | "statistik"
    | "formasi"
    | "manfaat"
    | "peraturan"
    | "footer";
  title: string;
  subtitle: string;
  description: string;
  images: string[];
  content: Record<string, any>;
  isActive: boolean;
  order: number;
  updatedAt: Date;
}

const LandingSectionSchema = new Schema(
  {
    sectionType: {
      type: String,
      required: true,
      enum: ["hero", "statistik", "formasi", "manfaat", "peraturan", "footer"],
    },
    title: {
      type: String,
      default: "",
    },
    subtitle: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String,
        default: [],
      },
    ],
    content: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
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

export default mongoose.models.LandingSection ||
  mongoose.model<ILandingSection>("LandingSection", LandingSectionSchema);
