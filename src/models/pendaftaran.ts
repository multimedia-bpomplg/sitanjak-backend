import mongoose, { Schema, Document } from "mongoose";

interface IPeserta {
  nama: string;
  posisi: string;
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
}

export interface IPendaftaran extends Document {
  kategori: "sendiri" | "bersama";
  jumlahPeserta: number;
  peserta: IPeserta[];
  suratPengantar: string;

  status: string;
  jawabanAdmin: string;
  createdAt: Date;
}

const PesertaSchema = new Schema<IPeserta>(
  {
    nama: { type: String, required: true },
    posisi: { type: String, required: true },
    tempatLahir: { type: String, required: true },
    tanggalLahir: { type: String, required: true },
    jenisKelamin: { type: String, required: true },

    provinsi: { type: String, required: true },
    kota: { type: String, required: true },
    kecamatan: { type: String, required: true },
    kelurahan: { type: String, required: true },

    alamatLengkap: { type: String, required: true },
    email: { type: String, required: true },
    wa: { type: String, required: true },
  },
  { _id: false }
);

const PendaftaranSchema = new Schema<IPendaftaran>(
  {
    kategori: {
      type: String,
      enum: ["sendiri", "bersama"],
      required: true,
    },

    jumlahPeserta: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    peserta: {
      type: [PesertaSchema],
      required: true,
    },

    suratPengantar: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Menunggu", "Sedang Diproses", "Disetujui", "Ditolak"],
      default: "Menunggu",
    },

    jawabanAdmin: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPendaftaran>("Pendaftaran", PendaftaranSchema);
