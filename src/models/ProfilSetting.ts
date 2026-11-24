import mongoose, { Schema, Document } from "mongoose";

export interface IProfilHighlight {
  title: string;
  desc: string;
  iconKey: string;
}

export interface IProfilSetting extends Document {
  key: string;
  overlineTag: string;
  headingLine1: string;
  headingHighlight: string;
  profilDescription: string;
  profilHighlights: IProfilHighlight[];
  visi: string;
  misiList: string[];
  dasarHukumRegulasi: string;
  dasarHukumTentang: string;
  tugasPokok: string;
  fungsiUtamaList: string[];
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProfilHighlightSchema = new Schema<IProfilHighlight>(
  {
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
    iconKey: { type: String, default: "shield", trim: true },
  },
  { _id: false },
);

const ProfilSettingSchema = new Schema<IProfilSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "landing-profil",
    },
    overlineTag: { type: String, required: true, trim: true },
    headingLine1: { type: String, required: true, trim: true },
    headingHighlight: { type: String, required: true, trim: true },
    profilDescription: { type: String, required: true, trim: true },
    profilHighlights: { type: [ProfilHighlightSchema], default: [] },
    visi: { type: String, required: true, trim: true },
    misiList: { type: [String], default: [] },
    dasarHukumRegulasi: { type: String, required: true, trim: true },
    dasarHukumTentang: { type: String, required: true, trim: true },
    tugasPokok: { type: String, required: true, trim: true },
    fungsiUtamaList: { type: [String], default: [] },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.ProfilSetting ||
  mongoose.model<IProfilSetting>("ProfilSetting", ProfilSettingSchema);
