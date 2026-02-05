import { Request, Response } from "express";
import Pendaftaran from "../models/pendaftaran";
import Formasi from "../models/Formasi";

// Default Formasi
const DEFAULT_FORMASI = [
  "Fungsi Tata Usaha",
  "Fungsi Penindakan",
  "Fungsi Pengujian",
  "Fungsi Pemeriksaan",
  "Fungsi Infokom",
];

export const getFormasi = async (req: Request, res: Response) => {
  try {
    // ===============================
    // 1. CEK & AUTO INSERT FORMASI
    // ===============================
    const count = await Formasi.countDocuments();

    if (count === 0) {
      const data = DEFAULT_FORMASI.map((item) => ({
        title: item,
        kuota: 5,
      }));

      await Formasi.insertMany(data);
    }

    // ===============================
    // 2. AMBIL FORMASI
    // ===============================
    const formasi = await Formasi.find();

    // ===============================
    // 3. HITUNG PESERTA
    // ===============================
    const statistik = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },

      {
        $group: {
          _id: "$peserta.posisi",
          total: { $sum: 1 },
        },
      },
    ]);

    // ===============================
    // 4. GABUNG DATA
    // ===============================
    const result = formasi.map((item) => {
      const found = statistik.find((s) => s._id === item.title);

      const jumlahPendaftar = found ? found.total : 0;
      const sisaKuota = item.kuota - jumlahPendaftar;

      return {
        _id: item._id,
        title: item.title,
        divisi: item.title,
        kuota: item.kuota,
        jurusan: [],
        kode: item.title.toUpperCase().replace(/\s/g, "-"),

        jumlahPendaftar,
        sisaKuota: sisaKuota < 0 ? 0 : sisaKuota,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data formasi",
    });
  }
};
