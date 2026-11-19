import mongoose, { Schema, Document } from "mongoose";

export interface IAspectScore {
  nilai: number;
  keterangan: string;
}

export interface IPenilaianAkhir extends Document {
  user: mongoose.Types.ObjectId;
  pesertaEmail: string;
  mentor: mongoose.Types.ObjectId;
  penilaiNama: string;
  penilaiNip: string;
  penilaiTtdImage: string;
  kehadiranTaatJadwal: IAspectScore;
  sikapKerja: IAspectScore;
  penguasaanMateri: IAspectScore;
  praktikKerja: IAspectScore;
  inisiatifKomunikasi: IAspectScore;
  nilaiRataRata: number;
  keteranganRataRata: string;
  kesan: string;
  saran: string;
  tanggalPenilaian: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AspectScoreSchema = new Schema<IAspectScore>(
  {
    nilai: { type: Number, min: 0, max: 100, required: true },
    keterangan: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const PenilaianAkhirSchema = new Schema<IPenilaianAkhir>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    pesertaEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      default: "",
    },
    mentor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    penilaiNama: {
      type: String,
      default: "",
      trim: true,
    },
    penilaiNip: {
      type: String,
      default: "",
      trim: true,
    },
    penilaiTtdImage: {
      type: String,
      default: "",
    },
    kehadiranTaatJadwal: { type: AspectScoreSchema, required: true },
    sikapKerja: { type: AspectScoreSchema, required: true },
    penguasaanMateri: { type: AspectScoreSchema, required: true },
    praktikKerja: { type: AspectScoreSchema, required: true },
    inisiatifKomunikasi: { type: AspectScoreSchema, required: true },
    nilaiRataRata: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    keteranganRataRata: {
      type: String,
      default: "",
      trim: true,
    },
    kesan: {
      type: String,
      default: "",
      trim: true,
    },
    saran: {
      type: String,
      default: "",
      trim: true,
    },
    tanggalPenilaian: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IPenilaianAkhir>(
  "PenilaianAkhir",
  PenilaianAkhirSchema,
);
