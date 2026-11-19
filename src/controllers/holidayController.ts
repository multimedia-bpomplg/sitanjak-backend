import { Response } from "express";
import Holiday, { HolidayType } from "../models/Holiday";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  ensureDefaultHolidaysSeeded,
  isHolidayWib,
  seedDefaultHolidays2026,
} from "../services/holidayService";

const VALID_TYPES: HolidayType[] = [
  "libur_nasional",
  "cuti_bersama",
  "khusus",
];

function getTodayIsoWib(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
}

export const getHolidays = async (req: AuthRequest, res: Response) => {
  try {
    await ensureDefaultHolidaysSeeded();

    const year = String(req.query.year || "").trim();
    const filter = year && /^\d{4}$/.test(year)
      ? { date: { $regex: `^${year}-` } }
      : {};

    const holidays = await Holiday.find(filter).sort({ date: 1 }).lean();
    return res.json({
      success: true,
      data: holidays,
    });
  } catch (err) {
    console.error("[GET HOLIDAYS ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat daftar hari libur",
    });
  }
};

export const checkTodayHoliday = async (req: AuthRequest, res: Response) => {
  try {
    await ensureDefaultHolidaysSeeded();
    const dateIso = String(req.query.date || "").trim() || getTodayIsoWib();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return res.status(400).json({ message: "Format tanggal harus YYYY-MM-DD" });
    }
    const status = await isHolidayWib(dateIso);
    return res.json({
      date: dateIso,
      ...status,
    });
  } catch (err) {
    console.error("[CHECK HOLIDAY ERROR]", err);
    return res.status(500).json({ message: "Gagal mengecek status hari libur" });
  }
};

export const upsertHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const date = String(req.body?.date || "").trim();
    const name = String(req.body?.name || "").trim();
    const rawType = String(req.body?.type || "libur_nasional").trim() as HolidayType;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "Format tanggal libur wajib YYYY-MM-DD",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Nama/keterangan hari libur wajib diisi",
      });
    }

    const type: HolidayType = VALID_TYPES.includes(rawType)
      ? rawType
      : "libur_nasional";

    const saved = await Holiday.findOneAndUpdate(
      { date },
      {
        $set: {
          date,
          name,
          type,
          createdBy: req.user?.id || null,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Hari libur berhasil disimpan",
      data: saved,
    });
  } catch (err) {
    console.error("[UPSERT HOLIDAY ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan hari libur",
    });
  }
};

export const deleteHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Holiday.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Data hari libur tidak ditemukan" });
    }

    return res.json({
      success: true,
      message: "Hari libur berhasil dihapus",
    });
  } catch (err) {
    console.error("[DELETE HOLIDAY ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus hari libur",
    });
  }
};

export const restoreDefaultHolidays2026 = async (
  _req: AuthRequest,
  res: Response,
) => {
  try {
    const inserted = await seedDefaultHolidays2026();
    return res.json({
      success: true,
      message:
        inserted > 0
          ? `${inserted} hari libur nasional 2026 berhasil ditambahkan.`
          : "Seluruh hari libur nasional 2026 bawaan sudah tersedia.",
      inserted,
    });
  } catch (err) {
    console.error("[SEED HOLIDAYS ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat ulang libur nasional 2026",
    });
  }
};
