import { Router } from "express";
import {
  getFooterSetting,
  updateFooterSetting,
  resetFooterSetting,
} from "../controllers/footerSettingController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

// Publik: baca data kontak & media sosial Footer
router.get("/", getFooterSetting);

// Superadmin: simpan perubahan atau reset ke default
router.put(
  "/",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  updateFooterSetting,
);

router.delete(
  "/",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  resetFooterSetting,
);

export default router;
