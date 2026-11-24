import mongoose, { Schema, Document } from "mongoose";

export interface IFooterSocialLink {
  platform: string;
  label: string;
  href: string;
}

export interface IFooterSetting extends Document {
  key: string;
  institutionName: string;
  address: string;
  phone: string;
  email: string;
  socialLinks: IFooterSocialLink[];
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const FooterSocialLinkSchema = new Schema<IFooterSocialLink>(
  {
    platform: { type: String, required: true, trim: true, default: "globe" },
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const FooterSettingSchema = new Schema<IFooterSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "landing-footer",
    },
    institutionName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    socialLinks: { type: [FooterSocialLinkSchema], default: [] },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.FooterSetting ||
  mongoose.model<IFooterSetting>("FooterSetting", FooterSettingSchema);
