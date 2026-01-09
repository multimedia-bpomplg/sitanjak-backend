import { Request, Response } from "express";
import Logbook from "../models/Logbook";

/* ================= CREATE ================= */
export const createLogbook = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const exists = await Logbook.findOne({
      user: userId,
      date: req.body.date,
    });

    if (exists) {
      return res.status(400).json({
        message: "Logbook untuk tanggal ini sudah diisi",
      });
    }

    const files =
      (req.files as Express.Multer.File[])?.map((f) => f.path) || [];

    const logbook = await Logbook.create({
      user: userId,
      ...req.body,
      files,
    });

    res.status(201).json(logbook);
  } catch (err) {
    res.status(500).json({ message: "Gagal menyimpan logbook" });
  }
};

/* ================= GET FILLED DATES ================= */
export const getFilledDates = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const logs = await Logbook.find({ user: userId }).select("date status");

    const result: Record<string, string> = {};
    logs.forEach((l) => {
      result[l.date] = l.status;
    });

    res.json(result); // ⬅️ OBJECT, BUKAN ARRAY
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil tanggal logbook",
    });
  }
};

/* ================= SUMMARY ================= */
export const getSummary = async (req: any, res: Response) => {
  const userId = req.user.id;

  const total = await Logbook.countDocuments({ user: userId });
  const hadir = await Logbook.countDocuments({
    user: userId,
    status: "hadir",
  });

  const tidakHadirDenganKeterangan = await Logbook.countDocuments({
    user: userId,
    status: "tidak_hadir_keterangan",
  });

  const tidakHadirTanpaKeterangan = await Logbook.countDocuments({
    user: userId,
    status: "tidak_hadir_tanpa_keterangan",
  });

  res.json({
    total,
    hadir,
    tidakHadirDenganKeterangan,
    tidakHadirTanpaKeterangan,
  });
};
/* ================= GET LOGBOOK BY DATE ================= */
export const getLogbookByDate = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;

    const logbook = await Logbook.findOne({
      user: userId,
      date,
    });

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook tidak ditemukan",
      });
    }

    res.json({
      status: logbook.status,
      judul: logbook.judul,
      pengalaman: logbook.pengalaman,
      kendala: logbook.kendala,
      keterangan: logbook.keterangan,
      files: logbook.files,
    });
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil detail logbook",
    });
  }
};
