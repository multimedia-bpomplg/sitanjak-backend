// models/WhatsAppConfig.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppConfig extends Document {
  phoneNumber: string;
  defaultMessage: string;
  buttonText: string;
  bubbleText: string;
  isActive: boolean;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  position: "bottom-right" | "bottom-left";
  updatedAt: Date;
}

const WhatsAppConfigSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      default: "6288274133623",
    },
    defaultMessage: {
      type: String,
      default: "Halo, saya ingin bertanya tentang pendaftaran magang.",
    },
    buttonText: {
      type: String,
      default: "Chat WhatsApp",
    },
    bubbleText: {
      type: String,
      default: "Chat WhatsApp",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    showOnMobile: {
      type: Boolean,
      default: true,
    },
    showOnDesktop: {
      type: Boolean,
      default: true,
    },
    position: {
      type: String,
      enum: ["bottom-right", "bottom-left"],
      default: "bottom-right",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.WhatsAppConfig ||
  mongoose.model<IWhatsAppConfig>("WhatsAppConfig", WhatsAppConfigSchema);
