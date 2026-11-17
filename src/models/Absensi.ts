import mongoose, { Schema, Document } from "mongoose";

export interface IAbsensiLocation {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
  distanceMeters: number;
  isInsideBpom: boolean;
}

export interface IAbsensiEntry {
  time: Date;
  timeWIB: string;
  photoPath: string;
  location: IAbsensiLocation;
  timeStatus: "on_time" | "late" | "on_time_note" | "early_no_note";
  timeStatusLabel: string;
  diffMinutes: number;
  score: number;
  keterangan?: string;
  attemptCount: number;
}

export interface IAbsensiKoreksiBy {
  id: mongoose.Types.ObjectId;
  name: string;
  role: string;
}

export type AttendanceMode = "masuk" | "wfh" | "izin";

export interface IAbsensi extends Document {
  user: mongoose.Types.ObjectId;
  email: string;
  date: string; // YYYY-MM-DD (WIB)
  attendanceMode: AttendanceMode;
  izinNote?: string;
  izinSubmittedAt?: Date;
  izinSubmittedWIB?: string;
  checkIn?: IAbsensiEntry;
  checkOut?: IAbsensiEntry;
  dailyScore: number;
  koreksiNote?: string;
  koreksiBy?: IAbsensiKoreksiBy;
  koreksiAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AbsensiLocationSchema = new Schema<IAbsensiLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number, default: 15 },
    address: { type: String, default: "" },
    distanceMeters: { type: Number, default: 0 },
    isInsideBpom: { type: Boolean, default: false },
  },
  { _id: false },
);

const AbsensiEntrySchema = new Schema<IAbsensiEntry>(
  {
    time: { type: Date, required: true },
    timeWIB: { type: String, required: true },
    photoPath: { type: String, required: true },
    location: { type: AbsensiLocationSchema, required: true },
    timeStatus: {
      type: String,
      enum: ["on_time", "late", "on_time_note", "early_no_note"],
      required: true,
    },
    timeStatusLabel: { type: String, required: true },
    diffMinutes: { type: Number, default: 0 },
    score: { type: Number, default: 100 },
    keterangan: { type: String, default: "" },
    attemptCount: { type: Number, default: 1 },
  },
  { _id: false },
);

const AbsensiSchema = new Schema<IAbsensi>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    attendanceMode: {
      type: String,
      enum: ["masuk", "wfh", "izin"],
      default: "masuk",
    },
    izinNote: {
      type: String,
      default: "",
    },
    izinSubmittedAt: {
      type: Date,
    },
    izinSubmittedWIB: {
      type: String,
      default: "",
    },
    checkIn: {
      type: AbsensiEntrySchema,
      default: undefined,
    },
    checkOut: {
      type: AbsensiEntrySchema,
      default: undefined,
    },
    dailyScore: {
      type: Number,
      default: 0,
    },
    koreksiNote: {
      type: String,
      default: "",
    },
    koreksiBy: {
      id: { type: Schema.Types.ObjectId, ref: "User" },
      name: String,
      role: String,
    },
    koreksiAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

/* 🔒 1 USER 1 RECORD ABSENSI PER TANGGAL */
AbsensiSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model<IAbsensi>("Absensi", AbsensiSchema);
