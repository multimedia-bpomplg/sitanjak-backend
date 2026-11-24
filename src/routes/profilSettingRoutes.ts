import { Router } from "express";
import {
  getProfilSetting,
  updateProfilSetting,
  resetProfilSetting,
} from "../controllers/profilSettingController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

// Publik: baca konten Profil, Visi & Misi, Tugas & Fungsi untuk Landing Page
router.get("/", getProfilSetting);

// Superadmin: simpan perubahan atau reset ke default
router.put(
  "/",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  updateProfilSetting,
);

router.delete(
  "/",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  resetProfilSetting,
);

export default router;
