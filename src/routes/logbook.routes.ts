import { Router } from "express";
import {
  createLogbook,
  getFilledDates,
  getSummary,
  getLogbookByDate,
  getLogbookByPeserta,
  approveLogbook,
  getLogbookPesertaByDate,
  getLogbookByPesertaByEmail, // 🔑 WAJIB
} from "../controllers/logbookController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadLogbook } from "../middlewares/uploadLogbook.middleware";

const router = Router();

/* ================= PESERTA ================= */

/* CREATE LOGBOOK + FOTO */
router.post(
  "/",
  authMiddleware,
  uploadLogbook.array("files", 3),
  createLogbook,
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
  getLogbookByPeserta,
);

/* APPROVE LOGBOOK */
router.put(
  "/mentor/approve/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  approveLogbook,
);

router.get(
  "/mentor/peserta/:userId/date/:date",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookPesertaByDate,
);

router.get(
  "/mentor/peserta/email/:email",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLogbookByPesertaByEmail,
);

router.get(
  "/logbook/peserta/:userId/date/:date",
  authMiddleware,
  getLogbookPesertaByDate,
);
export default router;
