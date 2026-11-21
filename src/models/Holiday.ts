import mongoose, { Schema, Document, Types } from "mongoose";

export type HolidayType = "libur_nasional" | "cuti_bersama" | "khusus";
export type HolidaySource = "auto" | "manual";

export interface IHoliday extends Document {
  date: string; // YYYY-MM-DD (WIB)
  name: string;
  type: HolidayType;
  source?: HolidaySource;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["libur_nasional", "cuti_bersama", "khusus"],
      default: "khusus",
    },
    source: {
      type: String,
      enum: ["auto", "manual"],
      default: "manual",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

HolidaySchema.index({ date: 1 }, { unique: true });

export default mongoose.models.Holiday ||
  mongoose.model<IHoliday>("Holiday", HolidaySchema);
