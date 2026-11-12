import mongoose, { Schema, Document, Types } from "mongoose";

export interface INotification extends Document {
  recipientId?: Types.ObjectId;
  recipientRoles?: string[];
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  linkUrl?: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    recipientRoles: {
      type: [String],
      default: [],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "alert"],
      default: "info",
    },
    linkUrl: {
      type: String,
      default: "",
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Indexing untuk query cepat
NotificationSchema.index({ createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

