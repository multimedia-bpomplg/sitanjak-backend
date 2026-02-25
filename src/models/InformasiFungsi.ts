import mongoose, { Schema, Document } from "mongoose";

export interface IInformasiFungsi extends Document {
  title: string;
  desc: string;
  jurusan: string[];
  gradient: string;
  border: string;
  text: string;
  lightBg: string;
  badge?: string;
}

const InformasiFungsiSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },

    desc: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
    },

    jurusan: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "Minimal 1 jurusan harus diisi",
      },
    },

    iconName: {
      type: String,
      default: "HiOfficeBuilding",
    },

    gradient: {
      type: String,
      default: "from-red-700 via-red-600 to-orange-500",
    },

    border: {
      type: String,
      default: "border-red-200",
    },

    text: {
      type: String,
      default: "text-red-600",
    },

    lightBg: {
      type: String,
      default: "bg-red-50",
    },

    badge: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IInformasiFungsi>(
  "InformasiFungsi",
  InformasiFungsiSchema,
);
