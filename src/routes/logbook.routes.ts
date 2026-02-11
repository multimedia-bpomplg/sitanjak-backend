import { Router } from "express";
import {
  createLogbook,
  getFilledDates,
  getSummary,
  getLogbookByDate,
  getLogbookByPeserta,
  approveLogbook,
  getLogbookPesertaByDate,
  getLogbookByPesertaByEmail,
  requestRevision,
  submitRevision,
} from "../controllers/logbookController";

import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadLogbook } from "../middlewares/upload.middleware";
import { checkLogbookFinalized } from "../middlewares/logbookFinalized.middleware";
import {
  downloadAllLogbookPDF,
  downloadLogbookByUserPDF,
  downloadLogbookByMentorPDF, // ⬅️ TAMBAH
} from "../controllers/pdfdownload";
import { getFilledDatesByPeserta } from "../controllers/logbookController";

const router = Router();

/* ================= PESERTA ================= */

/* CREATE LOGBOOK + FOTO */
router.post(
  "/",
  authMiddleware,
  uploadLogbook.fields([
    { name: "files", maxCount: 3 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  createLogbook, // ✅ HAPUS KOMA DI SINI
);

/* FILLED DATES */
router.get("/filled-dates", authMiddleware, getFilledDates);

/* SUMMARY */
router.get("/summary", authMiddleware, getSummary);

/* GET LOGBOOK BY DATE */
router.get("/date/:date", authMiddleware, getLogbookByDate);

/* ================= MENTOR ================= */

/* GET LOGBOOK PESERTA */
router.get(
  "/mentor/peserta/:userId",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookByPeserta, // ✅ HAPUS KOMA DI SINI
);

/* GET LOGBOOK PESERTA BY DATE */
router.get(
  "/mentor/peserta/:userId/date/:date",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookPesertaByDate, // ✅ HAPUS KOMA DI SINI
);

/* GET LOGBOOK PESERTA BY EMAIL */
router.get(
  "/mentor/peserta/email/:email",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookByPesertaByEmail, // ✅ HAPUS KOMA DI SINI
);

router.put(
  "/mentor/approve/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  checkLogbookFinalized, // ✅ TAMBAH MIDDLEWARE INI
  approveLogbook,
);

/* ================= DOWNLOAD SEMUA LOGBOOK (PDF) ================= */
router.get("/download/pdf", authMiddleware, downloadAllLogbookPDF);

/* ================= DOWNLOAD LOGBOOK PESERTA (ADMIN) ================= */
router.get(
  "/admin/:userId/download/pdf",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  downloadLogbookByUserPDF,
);

/* ================= DOWNLOAD LOGBOOK PESERTA (MENTOR) ================= */
router.get(
  "/mentor/:userId/download/pdf",
  authMiddleware,
  roleMiddleware(["mentor"]),
  downloadLogbookByMentorPDF,
);

/* ================= GET CALENDAR DATES FOR PESERTA (MENTOR) ================= */
router.get(
  "/mentor/calendar/:userId",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getFilledDatesByPeserta,
);

router.put(
  "/mentor/revisi/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  requestRevision,
);

router.put("/logbook/:id/submit-revision", authMiddleware, submitRevision);
export default router;
