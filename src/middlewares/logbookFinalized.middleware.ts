import { Request, Response, NextFunction } from "express";
import Logbook from "../models/Logbook";

export const checkLogbookFinalized = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const logbook = await Logbook.findById(id);

    if (!logbook) {
      return res.status(404).json({ message: "Logbook tidak ditemukan" });
    }

    // 🔥 IZINKAN JIKA STATUS REVISI
    if (logbook.isFinalized && logbook.approvalStatus !== "revisi") {
      return res.status(400).json({
        message: "Logbook sudah diproses dan tidak dapat diubah",
        status: logbook.approvalStatus,
        finalizedAt: logbook.finalizedAt,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking logbook status" });
  }
};
