import mongoose, { Schema, Document } from "mongoose";

export interface ILoginAttempt extends Document {
  email: string;
  ipAddress: string;
  userAgent?: string;
  attemptType: "request_otp" | "verify_otp" | "login_password";
  success: boolean;
  createdAt: Date;
  expiresAt: Date;
}

const LoginAttemptSchema: Schema = new Schema({
  email: { type: String, required: true, index: true },
  ipAddress: { type: String, required: true, index: true },
  userAgent: { type: String },
  attemptType: {
    type: String,
    enum: ["request_otp", "verify_otp", "login_password"],
    required: true,
  },
  success: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Hapus setelah 24 jam
    index: { expires: 0 },
  },
});

// Composite index untuk query cepat
LoginAttemptSchema.index({ email: 1, createdAt: -1 });
LoginAttemptSchema.index({ ipAddress: 1, createdAt: -1 });

export default mongoose.models.LoginAttempt ||
  mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);
