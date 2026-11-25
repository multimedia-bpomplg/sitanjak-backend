import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAttendanceTolerance extends Document {
  date: string; // YYYY-MM-DD (WIB)
  checkInLimitTime: string; // HH:mm (24h WIB, e.g. "08:30")
  reason: string;
  createdBy?: Types.ObjectId | null;
  createdByName?: string;
  createdByRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceToleranceSchema = new Schema<IAttendanceTolerance>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    checkInLimitTime: {
      type: String,
      required: true,
      trim: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      default: "Dispensasi Cuaca / Hujan",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdByName: {
      type: String,
      default: "",
    },
    createdByRole: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

AttendanceToleranceSchema.index({ date: 1 }, { unique: true });

export default mongoose.models.AttendanceTolerance ||
  mongoose.model<IAttendanceTolerance>(
    "AttendanceTolerance",
    AttendanceToleranceSchema,
  );
