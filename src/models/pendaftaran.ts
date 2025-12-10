import mongoose, { Schema, Document } from "mongoose";

export interface IPendaftaran extends Document {
  nama: string;
  email: string;
  nohp: string;
  sekolah: string;
  jurusan: string;
  tingkat: string;
  alamat: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  surat: string;
}

const PendaftaranSchema: Schema = new Schema({
  nama: { type: String, required: true },
  email: { type: String, required: true },
  nohp: { type: String, required: true },
  sekolah: { type: String, required: true },
  jurusan: { type: String, required: true },
  tingkat: { type: String, required: true },
  alamat: { type: String, required: true },
  tanggalMulai: { type: String, required: true },
  tanggalSelesai: { type: String, required: true },
  surat: { type: String, required: true },

  status: {
    type: String,
    enum: ["Menunggu", "Sedang Diproses", "Ditolak", "Disetujui"],
    default: "Menunggu",
  },

  jawabanAdmin: {
    type: String,
    default: "",
  },
});

export default mongoose.model<IPendaftaran>("Pendaftaran", PendaftaranSchema);
