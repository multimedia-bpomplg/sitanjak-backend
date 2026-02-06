// models/pendaftaran.ts - UPDATE
import mongoose, { Schema, Document } from "mongoose";

interface IAsal {
  jenis: "Universitas" | "SMK";
  nama: string;
}

interface IPeserta {
  user?: mongoose.Types.ObjectId;
  nama: string;
  posisi: string;
  jurusan: string;
  asal: IAsal;
  mentor?: mongoose.Types.ObjectId;
  tanggalMulaiMagang: string;
  tanggalSelesaiMagang: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  alamatLengkap: string;
  email: string;
  wa: string;
  // ✅ TAMBAHKAN FIELD STATUS MAGANG DENGAN OPTION LENGKAP
  statusMagang?:
    | "Menunggu"
    | "Sedang Magang"
    | "Selesai Magang"
    | "Tidak Magang";
}

export interface IPendaftaran extends Document {
  kategori: "sendiri" | "bersama";
  jumlahPeserta: number;
  peserta: IPeserta[];
  mentor?: mongoose.Types.ObjectId;
  suratPengantar: string;
  suratBalasan?: string;
  status: "Menunggu" | "Sedang Diproses" | "Disetujui" | "Ditolak";
  jawabanAdmin?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PesertaSchema = new Schema<IPeserta>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    nama: String,
    posisi: String,
    jurusan: String,
    asal: {
      jenis: String,
      nama: String,
    },
    mentor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    tanggalMulaiMagang: String,
    tanggalSelesaiMagang: String,
    tempatLahir: String,
    tanggalLahir: String,
    jenisKelamin: String,
    provinsi: String,
    kota: String,
    kecamatan: String,
    kelurahan: String,
    alamatLengkap: String,
    email: String,
    wa: String,
    // ✅ FIELD STATUS MAGANG DENGAN VALIDASI
    statusMagang: {
      type: String,
      enum: ["Menunggu", "Sedang Magang", "Selesai Magang", "Tidak Magang"],
      default: "Menunggu",
    },
  },
  { _id: false },
);

const PendaftaranSchema = new Schema(
  {
    kategori: String,
    jumlahPeserta: Number,
    peserta: [PesertaSchema],
    suratPengantar: String,
    suratBalasan: String,
    status: {
      type: String,
      enum: ["Menunggu", "Sedang Diproses", "Disetujui", "Ditolak"],
      default: "Menunggu",
    },
    jawabanAdmin: String,
  },
  { timestamps: true },
);

export default mongoose.model<IPendaftaran>("Pendaftaran", PendaftaranSchema);
