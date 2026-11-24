import { Request, Response } from "express";
import Pendaftaran from "../models/pendaftaran";
import Formasi, { IKuotaBulanan } from "../models/Formasi";

// Default Formasi
const DEFAULT_FORMASI = [
  "Fungsi Tata Usaha",
  "Fungsi Penindakan",
  "Fungsi Pengujian",
  "Fungsi Pemeriksaan",
  "Fungsi Infokom",
];

const MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const getCurrentMonthKeyWib = (): string => {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
    .slice(0, 7);
};

const toIsoDateOnly = (value?: string): string | null => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
};

const getMonthBounds = (monthKey: string): { start: string; end: string } => {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
};

const overlapsMonth = (
  mulai: string | undefined,
  selesai: string | undefined,
  monthKey: string,
): boolean => {
  const startIso = toIsoDateOnly(mulai);
  const endIso = toIsoDateOnly(selesai) || startIso;
  if (!startIso || !endIso) return false;
  const { start, end } = getMonthBounds(monthKey);
  return startIso <= end && endIso >= start;
};

const getEffectiveKuotaForMonth = (
  kuotaDefault: number,
  kuotaBulanan: IKuotaBulanan[] | undefined,
  monthKey: string,
): number => {
  const override = kuotaBulanan?.find((k) => k.bulan === monthKey);
  return override ? override.kuota : kuotaDefault;
};

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

    // Ambil data statistik pendaftar aktif dan selesai
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
          "peserta.statusMagang": { $ne: "Tidak Magang" },
        },
      },
      {
        $group: {
          _id: "$peserta.posisi",

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

          selesai: {
            $sum: {
              $cond: [
                { $eq: ["$peserta.statusMagang", "Selesai Magang"] },
                1,
                0,
              ],
            },
          },

          statusMagangList: {
            $push: "$peserta.statusMagang",
          },

          tanggalMulaiMagangList: {
            $push: "$peserta.tanggalMulaiMagang",
          },

          tanggalSelesaiMagangList: {
            $push: "$peserta.tanggalSelesaiMagang",
          },
        },
      },
    ]);

    const currentMonthKey = getCurrentMonthKeyWib();

    // Gabungkan data
    const result = formasi.map((item) => {
      const found = statistik.find((s) => s._id === item.title);

      const jumlahPendaftar = found ? found.aktif : 0;
      const jumlahSelesaiMagang = found ? found.selesai : 0;
      const kuotaDefault = item.kuota ?? 0;
      const kuotaBulanan: IKuotaBulanan[] = Array.isArray(item.kuotaBulanan)
        ? [...item.kuotaBulanan]
            .map((k: any) => ({ bulan: k.bulan, kuota: k.kuota }))
            .sort((a, b) => a.bulan.localeCompare(b.bulan))
        : [];

      const kuotaBulanIni = getEffectiveKuotaForMonth(
        kuotaDefault,
        kuotaBulanan,
        currentMonthKey,
      );

      const mulaiList: string[] = found?.tanggalMulaiMagangList || [];
      const selesaiList: string[] = found?.tanggalSelesaiMagangList || [];
      const terisiBulanIni = mulaiList.reduce((acc, mulai, idx) => {
        return overlapsMonth(mulai, selesaiList[idx], currentMonthKey)
          ? acc + 1
          : acc;
      }, 0);

      const sisaKuota = Math.max(0, kuotaBulanIni - terisiBulanIni);

      return {
        _id: item._id,
        title: item.title,
        divisi: item.title,
        kuota: kuotaBulanIni,
        kuotaDefault,
        kuotaBulanan,
        jurusan: Array.isArray(item.jurusan) ? item.jurusan : [],
        kode: item.kode || item.title.toUpperCase().replace(/\s/g, "-"),

        jumlahPendaftar,
        jumlahSelesaiMagang,
        sisaKuota,

        statusMagang: found?.statusMagangList || [],
        tanggalMulaiMagang: mulaiList,
        tanggalSelesaiMagang: selesaiList,
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

const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildKodeSlug = (title: string): string => {
  const cleaned = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `FORMASI-${Date.now()}`;
};

export const createFormasi = async (req: Request, res: Response) => {
  try {
    const rawTitle = String(req.body?.title || "").trim();
    const rawKuota = req.body?.kuota;
    const rawJurusan = req.body?.jurusan;

    if (!rawTitle) {
      return res.status(400).json({
        message: "Nama formasi wajib diisi",
      });
    }

    const parsedKuota = rawKuota === undefined ? 5 : Number(rawKuota);
    if (!Number.isInteger(parsedKuota) || parsedKuota < 0) {
      return res.status(400).json({
        message: "Kuota standar harus berupa bilangan bulat >= 0",
      });
    }

    const existingTitle = await Formasi.findOne({
      title: new RegExp(`^${escapeRegex(rawTitle)}$`, "i"),
    }).lean();

    if (existingTitle) {
      return res.status(409).json({
        message: `Formasi "${rawTitle}" sudah terdaftar`,
      });
    }

    const parsedJurusan: string[] = Array.isArray(rawJurusan)
      ? Array.from(
          new Set(
            rawJurusan
              .map((j: unknown) => String(j || "").trim())
              .filter(Boolean),
          ),
        )
      : typeof rawJurusan === "string"
        ? Array.from(
            new Set(
              rawJurusan
                .split(",")
                .map((j) => j.trim())
                .filter(Boolean),
            ),
          )
        : [];

    const baseKode = buildKodeSlug(rawTitle);
    let candidateKode = baseKode;
    let suffix = 2;
    while (await Formasi.exists({ kode: candidateKode })) {
      candidateKode = `${baseKode}-${suffix}`;
      suffix += 1;
    }

    const created = await Formasi.create({
      title: rawTitle,
      kuota: parsedKuota,
      kuotaBulanan: [],
      jurusan: parsedJurusan,
      kode: candidateKode,
      isActive: true,
    });

    return res.status(201).json({
      message: `Formasi "${rawTitle}" berhasil ditambahkan`,
      data: created,
    });
  } catch (error) {
    console.error("[CREATE FORMASI ERROR]", error);
    return res.status(500).json({
      message: "Gagal menambahkan formasi baru",
    });
  }
};

export const updateKuotaFormasi = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { kuota, kuotaBulanan } = req.body;

    const updateFields: Record<string, any> = {};

    if (kuota !== undefined) {
      const parsedKuota = Number(kuota);
      if (!Number.isInteger(parsedKuota) || parsedKuota < 0) {
        return res.status(400).json({
          message: "Kuota standar harus berupa bilangan bulat >= 0",
        });
      }
      updateFields.kuota = parsedKuota;
    }

    if (kuotaBulanan !== undefined) {
      if (!Array.isArray(kuotaBulanan)) {
        return res.status(400).json({
          message: "kuotaBulanan harus berupa array",
        });
      }

      const normalizedMap = new Map<string, number>();
      for (const entry of kuotaBulanan) {
        const bulan = String(entry?.bulan || "").trim();
        const nilai = Number(entry?.kuota);
        if (!MONTH_KEY_REGEX.test(bulan)) {
          return res.status(400).json({
            message: `Format bulan "${bulan}" tidak valid (gunakan YYYY-MM)`,
          });
        }
        if (!Number.isInteger(nilai) || nilai < 0) {
          return res.status(400).json({
            message: `Kuota untuk bulan ${bulan} harus berupa bilangan bulat >= 0`,
          });
        }
        normalizedMap.set(bulan, nilai);
      }

      updateFields.kuotaBulanan = Array.from(normalizedMap.entries())
        .map(([bulan, nilai]) => ({ bulan, kuota: nilai }))
        .sort((a, b) => a.bulan.localeCompare(b.bulan));
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        message: "Tidak ada data kuota yang diperbarui",
      });
    }

    // Gunakan findByIdAndUpdate pada field kuota saja agar aman untuk dokumen lama tanpa field kode
    const updated = await Formasi.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({
        message: "Formasi tidak ditemukan",
      });
    }

    res.json({
      message: "Kuota formasi berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    console.error("[UPDATE KUOTA FORMASI ERROR]", error);
    res.status(500).json({
      message: "Gagal memperbarui kuota formasi",
    });
  }
};

export const upsertKuotaBulanan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bulan, kuota } = req.body;

    const bulanStr = String(bulan || "").trim();
    const parsedKuota = Number(kuota);

    if (!MONTH_KEY_REGEX.test(bulanStr)) {
      return res.status(400).json({
        message: "Format bulan tidak valid (gunakan YYYY-MM, contoh: 2026-11)",
      });
    }

    if (!Number.isInteger(parsedKuota) || parsedKuota < 0) {
      return res.status(400).json({
        message: "Kuota bulanan harus berupa bilangan bulat >= 0",
      });
    }

    const existing = await Formasi.findById(id).lean<any>();
    if (!existing) {
      return res.status(404).json({
        message: "Formasi tidak ditemukan",
      });
    }

    const currentOverrides: IKuotaBulanan[] = Array.isArray(
      existing.kuotaBulanan,
    )
      ? existing.kuotaBulanan
      : [];

    const filtered = currentOverrides.filter((k) => k.bulan !== bulanStr);
    filtered.push({ bulan: bulanStr, kuota: parsedKuota });
    filtered.sort((a, b) => a.bulan.localeCompare(b.bulan));

    const updated = await Formasi.findByIdAndUpdate(
      id,
      { $set: { kuotaBulanan: filtered } },
      { new: true },
    );

    res.json({
      message: `Kuota khusus bulan ${bulanStr} berhasil disimpan`,
      data: updated,
    });
  } catch (error) {
    console.error("[UPSERT KUOTA BULANAN ERROR]", error);
    res.status(500).json({
      message: "Gagal menyimpan kuota bulanan",
    });
  }
};

export const deleteKuotaBulanan = async (req: Request, res: Response) => {
  try {
    const { id, bulan } = req.params;
    const bulanStr = String(bulan || "").trim();

    if (!MONTH_KEY_REGEX.test(bulanStr)) {
      return res.status(400).json({
        message: "Format bulan tidak valid",
      });
    }

    const updated = await Formasi.findByIdAndUpdate(
      id,
      { $pull: { kuotaBulanan: { bulan: bulanStr } } },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({
        message: "Formasi tidak ditemukan",
      });
    }

    res.json({
      message: `Penyesuaian kuota bulan ${bulanStr} berhasil dihapus (kembali ke kuota standar)`,
      data: updated,
    });
  } catch (error) {
    console.error("[DELETE KUOTA BULANAN ERROR]", error);
    res.status(500).json({
      message: "Gagal menghapus kuota bulanan",
    });
  }
};

// Controller lainnya tetap sama...
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
