import mongoose, { Schema, Document } from "mongoose";

export interface IRateLimit extends Document {
  key: string; // email atau ipAddress
  type: "otp_request" | "otp_verify";
  count: number;
  resetAt: Date;
  createdAt: Date;
}

const RateLimitSchema: Schema = new Schema(
  {
    key: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["otp_request", "otp_verify"],
      required: true,
    },
    count: { type: Number, default: 1 },
    resetAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Composite unique index
RateLimitSchema.index({ key: 1, type: 1 }, { unique: true });

export default mongoose.models.RateLimit ||
  mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);
