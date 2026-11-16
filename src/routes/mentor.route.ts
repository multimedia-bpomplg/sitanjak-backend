import { Router } from "express";
import {
  buatMentor,
  getPesertaBimbingan,
  getPesertaDetail,
  getMentorDashboardSummary,
} from "../controllers/mentorController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

router.post(
  "/buat-mentor",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  buatMentor,
);

router.get(
  "/dashboard-summary",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getMentorDashboardSummary,
);

router.get(
  "/peserta",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getPesertaBimbingan,
);

router.get(
  "/peserta/:pesertaId",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getPesertaDetail,
);

export default router;
