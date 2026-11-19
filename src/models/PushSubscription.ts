import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPushSubscription extends Document {
  user: Types.ObjectId;
  email: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  lastSuccessAt?: Date;
  lastErrorAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSuccessAt: {
      type: Date,
      default: undefined,
    },
    lastErrorAt: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true },
);

export default mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
