import mongoose, { Schema, Document } from "mongoose";

export interface IOtp extends Document {
  email: string;
  otp: string;
  type: "login" | "lupa_password" | "verifikasi";
  expiresAt: Date;
  used: boolean;
  attempts: number; // Track percobaan gagal
  deviceFingerprint?: string; // Fingerprint perangkat
  ipAddress?: string;
  createdAt: Date;
}

const OtpSchema: Schema = new Schema(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    type: {
      type: String,
      enum: ["login", "lupa_password", "verifikasi"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    deviceFingerprint: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

// Index untuk auto delete expired OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index untuk query cepat
OtpSchema.index({ email: 1, type: 1, used: 1 });
OtpSchema.index({ createdAt: 1 });

export default mongoose.models.Otp || mongoose.model<IOtp>("Otp", OtpSchema);
