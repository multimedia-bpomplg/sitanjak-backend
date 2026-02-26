import mongoose, { Schema, Document } from "mongoose";

export interface IBlockedIP extends Document {
  ipAddress: string;
  reason: "too_many_attempts" | "suspicious_activity";
  attempts: number;
  blockedUntil: Date;
  createdAt: Date;
}

const BlockedIPSchema: Schema = new Schema({
  ipAddress: { type: String, required: true, unique: true, index: true },
  reason: {
    type: String,
    enum: ["too_many_attempts", "suspicious_activity"],
    required: true,
  },
  attempts: { type: Number, default: 1 },
  blockedUntil: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto delete setelah masa blokir berakhir
BlockedIPSchema.index({ blockedUntil: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.BlockedIP ||
  mongoose.model<IBlockedIP>("BlockedIP", BlockedIPSchema);
