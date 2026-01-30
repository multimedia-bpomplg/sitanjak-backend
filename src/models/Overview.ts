import mongoose, { Schema, Document } from "mongoose";

export interface IOverviewStats extends Document {
  // Real-time stats
  pesertaAktif: number;
  mentorAktif: number;
  adminAktif: number;
  pendaftaranAktif: number;
  pendaftaranHariIni: number;
  logbookHariIni: number;
  totalPendaftar: number;
  totalLogbook: number;

  // Time series data
  date: Date;
  logbook: number;
  pendaftaran: number;
  peserta_aktif: number;
  mentor_aktif: number;
  admin_aktif: number;

  // Statistik
  statistikPosisi: Array<{ posisi: string; count: number }>;
  statistikAsal: Array<{ jenis: string; count: number }>;
  statistikGender: Array<{ gender: string; count: number }>;
  statistikSelesai: Array<{ periode: string; count: number }>;

  // Metadata
  year: number;
  month: number;
  dataStatus: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OverviewStatsSchema = new Schema(
  {
    // Real-time stats
    pesertaAktif: { type: Number, default: 0 },
    mentorAktif: { type: Number, default: 0 },
    adminAktif: { type: Number, default: 0 },
    pendaftaranAktif: { type: Number, default: 0 },
    pendaftaranHariIni: { type: Number, default: 0 },
    logbookHariIni: { type: Number, default: 0 },
    totalPendaftar: { type: Number, default: 0 },
    totalLogbook: { type: Number, default: 0 },

    // Time series
    date: { type: Date, required: true, index: true },
    logbook: { type: Number, default: 0 },
    pendaftaran: { type: Number, default: 0 },
    peserta_aktif: { type: Number, default: 0 },
    mentor_aktif: { type: Number, default: 0 },
    admin_aktif: { type: Number, default: 0 },

    // Statistik
    statistikPosisi: [
      {
        posisi: String,
        count: Number,
        _id: false,
      },
    ],
    statistikAsal: [
      {
        jenis: String,
        count: Number,
        _id: false,
      },
    ],
    statistikGender: [
      {
        gender: String,
        count: Number,
        _id: false,
      },
    ],
    statistikSelesai: [
      {
        periode: String,
        count: Number,
        _id: false,
      },
    ],

    // Metadata
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true },
    dataStatus: {
      type: String,
      enum: ["available", "empty", "error"],
      default: "available",
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "overview_stats",
  },
);

// Index untuk query yang sering digunakan
OverviewStatsSchema.index({ year: 1, month: 1 });
OverviewStatsSchema.index({ date: 1 });
OverviewStatsSchema.index({ year: 1, date: 1 });
OverviewStatsSchema.index({ dataStatus: 1 });
OverviewStatsSchema.index({ "statistikPosisi.count": -1 });

export default mongoose.models.OverviewStats ||
  mongoose.model<IOverviewStats>("OverviewStats", OverviewStatsSchema);
