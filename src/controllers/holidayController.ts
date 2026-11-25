import { Response } from "express";
import Holiday, { HolidayType } from "../models/Holiday";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  ensureDefaultHolidaysSeeded,
  isHolidayWib,
  syncHolidaysForYear,
} from "../services/holidayService";

const VALID_TYPES: HolidayType[] = [
  "libur_nasional",
  "cuti_bersama",
  "khusus",
  "hari_masuk",
];

function getTodayIsoWib(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
}

export const getHolidays = async (req: AuthRequest, res: Response) => {
  try {
    const yearStr = String(req.query.year || "").trim();
    const targetYear = /^\d{4}$/.test(yearStr) ? Number(yearStr) : undefined;
    await ensureDefaultHolidaysSeeded(targetYear);

    const filter = targetYear
      ? { date: { $regex: `^${targetYear}-` } }
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
    const rawType = String(req.body?.type || "khusus").trim() as HolidayType;

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
      : "khusus";

    const existing = await Holiday.findOne({ date });
    const preservedOriginalType =
      type === "hari_masuk"
        ? existing?.originalType ||
          (existing?.type === "libur_nasional" || existing?.type === "cuti_bersama"
            ? existing.type
            : null)
        : null;

    const saved = await Holiday.findOneAndUpdate(
      { date },
      {
        $set: {
          date,
          name,
          type,
          originalType: preservedOriginalType,
          source: "manual",
          createdBy: req.user?.id || null,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message:
        type === "hari_masuk"
          ? "Tanggal berhasil dibuka sebagai hari kerja (tetap masuk)"
          : "Hari libur khusus berhasil disimpan",
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

export const toggleHolidayWorkday = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const doc = await Holiday.findById(id);
    if (!doc) {
      return res
        .status(404)
        .json({ message: "Data hari libur tidak ditemukan" });
    }

    if (doc.type === "hari_masuk") {
      if (doc.originalType === "libur_nasional" || doc.originalType === "cuti_bersama") {
        doc.type = doc.originalType;
        doc.source = "auto";
        doc.originalType = null;
        await doc.save();
        return res.json({
          success: true,
          message: "Tanggal berhasil dikembalikan menjadi hari libur",
          data: doc,
        });
      }

      await Holiday.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: "Pengaturan hari kerja khusus berhasil dihapus",
      });
    }

    if (doc.type === "libur_nasional" || doc.type === "cuti_bersama") {
      doc.originalType = doc.type;
    }
    doc.type = "hari_masuk";
    doc.source = "manual";
    doc.createdBy = (req.user?.id as any) || null;
    await doc.save();

    return res.json({
      success: true,
      message: `${doc.name || doc.date} dibuka sebagai hari kerja (tetap masuk)`,
      data: doc,
    });
  } catch (err) {
    console.error("[TOGGLE HOLIDAY WORKDAY ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengubah status hari masuk",
    });
  }
};

export const restoreDefaultHolidays2026 = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const rawYear = String(req.query?.year || req.body?.year || "").trim();
    const fallbackYear = Number(getTodayIsoWib().slice(0, 4));
    const targetYear = /^\d{4}$/.test(rawYear) ? Number(rawYear) : fallbackYear;

    const result = await syncHolidaysForYear(targetYear, true);
    return res.json({
      success: true,
      message:
        result.source === "google_calendar"
          ? `${result.synced} hari libur kalender Indonesia tahun ${targetYear} berhasil disinkronkan.`
          : `Kalender lokal tahun ${targetYear} diperbarui (${result.synced} entri baru).`,
      ...result,
    });
  } catch (err) {
    console.error("[SYNC HOLIDAYS ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menyinkronkan libur nasional dari kalender",
    });
  }
};
