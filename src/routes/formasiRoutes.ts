import { Router } from "express";
import {
  createFormasi,
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

// Tambah formasi baru serta kelola kuota standar & bulanan (khusus admin & superadmin)
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  createFormasi,
);
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
