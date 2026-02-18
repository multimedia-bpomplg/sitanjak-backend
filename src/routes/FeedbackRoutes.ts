// routes/feedback.routes.ts
import { Router } from "express";
import {
  createFeedback,
  getFeedbackByMonth,
  getRiwayatFeedback,
  getFeedbackForMentor,
  respondFeedback,
  getAllFeedback,
  getFeedbackDetail,
  sendFeedbackToMentor,
} from "../controllers/feedbackController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ================= PESERTA ================= */
router.post("/", authMiddleware, createFeedback);
router.get("/riwayat", authMiddleware, getRiwayatFeedback);
router.get("/:month", authMiddleware, getFeedbackByMonth);
router.put("/:id/send-to-mentor", authMiddleware, sendFeedbackToMentor);

/* ================= MENTOR ================= */
router.get(
  "/mentor/semua-feedback",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getFeedbackForMentor,
);

router.put(
  "/mentor/respond/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  respondFeedback,
);

/* ================= ADMIN/SUPERADMIN ================= */
router.get(
  "/admin/semua-feedback",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllFeedback,
);

router.get(
  "/admin/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getFeedbackDetail,
);

export default router;
