import { Router } from "express";
import { buatMentor } from "../controllers/mentorController";
import { authMiddleware } from "../middlelwares/auth.middleware";
import { roleMiddleware } from "../middlelwares/role.middleware";

const router = Router();

router.post(
  "/buat-mentor",
  authMiddleware,
  roleMiddleware(["superadmin"]), // ✅ BENAR
  buatMentor
);

export default router;
