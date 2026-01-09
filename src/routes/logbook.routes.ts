import { Router } from "express";
import {
  createLogbook,
  getFilledDates,
  getSummary,
  getLogbookByDate,
} from "../controllers/logbookController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { uploadLogbook } from "../middlewares/uploadLogbook.middleware";

const router = Router();

/* CREATE LOGBOOK + FOTO */
router.post(
  "/",
  authMiddleware,
  uploadLogbook.array("files", 3),
  createLogbook
);

/* FILLED DATES */
router.get("/filled-dates", authMiddleware, getFilledDates);

/* SUMMARY */
router.get("/summary", authMiddleware, getSummary);

/* GET LOGBOOK BY DATE */
router.get("/:date", authMiddleware, getLogbookByDate);

export default router;
