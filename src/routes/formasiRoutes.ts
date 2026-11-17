import { Router } from "express";
import {
  getFormasi,
  getPrediksiFormasi,
  getSelesaiMagang,
  updateKuotaFormasi,
  upsertKuotaBulanan,
  deleteKuotaBulanan,
} from "../controllers/formasiController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

router.get("/", getFormasi);
router.get("/prediksi", getPrediksiFormasi);
router.get("/selesai-magang", getSelesaiMagang);

// Kelola kuota standar & kuota khusus per bulan (khusus admin & superadmin)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  updateKuotaFormasi,
);
router.put(
  "/:id/kuota-bulanan",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  upsertKuotaBulanan,
);
router.delete(
  "/:id/kuota-bulanan/:bulan",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteKuotaBulanan,
);

export default router;
