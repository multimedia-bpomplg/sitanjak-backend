import { Router } from "express";
import {
  getHolidays,
  checkTodayHoliday,
  upsertHoliday,
  deleteHoliday,
  restoreDefaultHolidays2026,
} from "../controllers/holidayController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

router.get("/", authMiddleware, getHolidays);
router.get("/check", authMiddleware, checkTodayHoliday);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  upsertHoliday,
);
router.post(
  "/seed-2026",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  restoreDefaultHolidays2026,
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteHoliday,
);

export default router;
