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
    const count = await Formasi.countDocuments();

    if (count === 0) {
      const data = DEFAULT_FORMASI.map((item) => ({
        title: item,
        kuota: 5,
      }));

      await Formasi.insertMany(data);
    }
    const formasi = await Formasi.find();

    const statistik = await Pendaftaran.aggregate([
      {
        $match: {
          status: "Disetujui",
        },
      },

      {
        $unwind: "$peserta",
      },

      {
        $match: {
          "peserta.posisi": { $ne: "" },
        },
      },

      {
        $group: {
          _id: "$peserta.posisi",

          // yang masih memakai kuota
          aktif: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$peserta.statusMagang",
                    ["Belum Waktu Magang", "Sedang Magang"],
                  ],
                },
                1,
                0,
              ],
            },
          },

          // yang sudah selesai magang
          selesai: {
            $sum: {
              $cond: [
                { $eq: ["$peserta.statusMagang", "Selesai Magang"] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // ===============================
    // 4. GABUNG DATA
    // ===============================
    const result = formasi.map((item) => {
      const found = statistik.find((s) => s._id === item.title);

      const jumlahPendaftar = found ? found.aktif : 0;
      const jumlahSelesaiMagang = found ? found.selesai : 0;
      const sisaKuota = item.kuota - jumlahPendaftar;

      return {
        _id: item._id,
        title: item.title,
        divisi: item.title,
        kuota: item.kuota,
        jurusan: [],
        kode: item.title.toUpperCase().replace(/\s/g, "-"),

        jumlahPendaftar,
        jumlahSelesaiMagang,
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

export const getPrediksiFormasi = async (req: Request, res: Response) => {
  try {
    const data = await Pendaftaran.find({
      status: "Disetujui",
      "peserta.statusMagang": {
        $in: ["Sedang Magang", "Belum Waktu Magang"],
      },
    });

    const map: any = {};

    data.forEach((d) => {
      d.peserta.forEach((p) => {
        if (
          ["Sedang Magang", "Belum Waktu Magang"].includes(p.statusMagang || "")
        ) {
          const posisi = p.posisi;
          const selesai = new Date(p.tanggalSelesaiMagang);

          if (!map[posisi]) {
            map[posisi] = [];
          }

          map[posisi].push(selesai);
        }
      });
    });

    const result: any = {};

    Object.keys(map).forEach((posisi) => {
      const dates = map[posisi].sort(
        (a: Date, b: Date) => a.getTime() - b.getTime(),
      );

      const first = dates[0];

      const count = dates.filter(
        (d: Date) => d.getTime() === first.getTime(),
      ).length;

      const availableDate = new Date(first);
      availableDate.setDate(availableDate.getDate() + 1);

      result[posisi] = {
        slotAkanKosong: count,
        tersediaMulai: availableDate,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal ambil prediksi" });
  }
};

export const getSelesaiMagang = async (req: Request, res: Response) => {
  try {
    const data = await Pendaftaran.aggregate([
      {
        $match: {
          status: "Disetujui",
        },
      },

      {
        $unwind: "$peserta",
      },

      {
        $match: {
          "peserta.statusMagang": "Selesai Magang",
        },
      },

      {
        $group: {
          _id: null,
          totalSelesaiMagang: { $sum: 1 },
        },
      },
    ]);

    const total = data.length > 0 ? data[0].totalSelesaiMagang : 0;

    res.json({
      totalSelesaiMagang: total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal mengambil data selesai magang",
    });
  }
};
