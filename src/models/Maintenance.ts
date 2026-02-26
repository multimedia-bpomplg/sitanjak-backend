import mongoose, { Schema, Document } from "mongoose";

export interface IMaintenance extends Document {
  isActive: boolean;
  isManual: boolean; // 🔥 TAMBAHAN
  startTime: Date | null;
  endTime: Date | null;
  activatedBy: string | null;
  history: {
    startTime: Date;
    endTime: Date | null;
    activatedBy: string;
    durationMinutes: number | null;
    isManual: boolean;
  }[];
}

const MaintenanceSchema = new Schema<IMaintenance>({
  isActive: { type: Boolean, default: false },
  isManual: { type: Boolean, default: false }, // 🔥 TAMBAHAN
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  activatedBy: { type: String, default: null },

  history: [
    {
      startTime: Date,
      endTime: Date,
      activatedBy: String,
      durationMinutes: Number,
      isManual: Boolean,
    },
  ],
});

export default mongoose.model<IMaintenance>("Maintenance", MaintenanceSchema);
