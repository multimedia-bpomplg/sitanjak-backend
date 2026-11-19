import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPushReminderLog extends Document {
  user: Types.ObjectId;
  date: string; // YYYY-MM-DD (WIB)
  type: "absen_pulang_19";
  createdAt: Date;
}

const PushReminderLogSchema = new Schema<IPushReminderLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["absen_pulang_19"],
      required: true,
    },
  },
  { timestamps: true },
);

PushReminderLogSchema.index({ user: 1, date: 1, type: 1 }, { unique: true });
PushReminderLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

export default mongoose.models.PushReminderLog ||
  mongoose.model<IPushReminderLog>("PushReminderLog", PushReminderLogSchema);
