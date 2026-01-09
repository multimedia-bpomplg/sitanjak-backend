import { Router } from "express";
import { buatMentor } from "../controllers/mentorController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

router.post(
  "/buat-mentor",
  authMiddleware,
  roleMiddleware(["superadmin"]), // ✅ BENAR
  buatMentor
);

export default router;
