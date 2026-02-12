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
  getLogbookDetail, // 🔥 TAMBAH
  getFilledDatesByPeserta,
} from "../controllers/logbookController";

import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadLogbook } from "../middlewares/upload.middleware";
import { checkLogbookFinalized } from "../middlewares/logbookFinalized.middleware";
import {
  downloadAllLogbookPDF,
  downloadLogbookByUserPDF,
  downloadLogbookByMentorPDF,
} from "../controllers/pdfdownload";

const router = Router();

/* ================= PESERTA ================= */

// CREATE LOGBOOK + FOTO
router.post(
  "/",
  authMiddleware,
  uploadLogbook.fields([
    { name: "files", maxCount: 3 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  createLogbook,
);

// GET FILLED DATES
router.get("/filled-dates", authMiddleware, getFilledDates);

// GET SUMMARY
router.get("/summary", authMiddleware, getSummary);

// GET LOGBOOK BY DATE
router.get("/date/:date", authMiddleware, getLogbookByDate);

// 🔥 GET LOGBOOK DETAIL BY ID
router.get("/:id/detail", authMiddleware, getLogbookDetail);

// 🔥 SUBMIT REVISION (PESERTA)
router.put(
  "/:id/submit-revision",
  authMiddleware,
  uploadLogbook.fields([
    { name: "files", maxCount: 3 },
    { name: "pdfFile", maxCount: 1 },
  ]),
  submitRevision,
);

/* ================= MENTOR ================= */

// GET LOGBOOK PESERTA
router.get(
  "/mentor/peserta/:userId",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookByPeserta,
);

// GET LOGBOOK PESERTA BY DATE
router.get(
  "/mentor/peserta/:userId/date/:date",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookPesertaByDate,
);

// GET LOGBOOK PESERTA BY EMAIL
router.get(
  "/mentor/peserta/email/:email",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookByPesertaByEmail,
);

// APPROVE/REJECT LOGBOOK
router.put(
  "/mentor/approve/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  checkLogbookFinalized,
  approveLogbook,
);

// 🔥 REQUEST REVISION (MENTOR)
router.put(
  "/mentor/request-revision/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  requestRevision,
);

// GET CALENDAR DATES FOR PESERTA (MENTOR)
router.get(
  "/mentor/calendar/:userId",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getFilledDatesByPeserta,
);

/* ================= DOWNLOAD PDF ================= */

router.get("/download/pdf", authMiddleware, downloadAllLogbookPDF);

router.get(
  "/admin/:userId/download/pdf",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  downloadLogbookByUserPDF,
);

router.get(
  "/mentor/:userId/download/pdf",
  authMiddleware,
  roleMiddleware(["mentor"]),
  downloadLogbookByMentorPDF,
);

export default router;
