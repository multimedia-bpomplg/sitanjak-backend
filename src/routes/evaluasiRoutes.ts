import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import {
  getMyEvaluasi,
  upsertMyEvaluasi,
  getManageEvaluasiList,
  reviewEvaluasi,
  adminUpdateEvaluasi,
  adminDeleteEvaluasi,
} from "../controllers/evaluasiController";

const router = Router();

// Peserta membaca & mengisi/merevisi Evaluasi & Surat Pernyataan miliknya
router.get("/me", authMiddleware, getMyEvaluasi);
router.put("/me", authMiddleware, upsertMyEvaluasi);

// Mentor, Admin, Superadmin melihat daftar evaluasi & surat pernyataan
router.get(
  "/manage",
  authMiddleware,
  roleMiddleware(["mentor", "admin", "superadmin"]),
  getManageEvaluasiList,
);
// Hanya Mentor pembimbing yang dapat menyetujui atau meminta revisi
router.patch(
  "/:id/review",
  authMiddleware,
  roleMiddleware(["mentor"]),
  reviewEvaluasi,
);

// Admin & Superadmin dapat mengelola penuh (edit & hapus/reset data evaluasi)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  adminUpdateEvaluasi,
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  adminDeleteEvaluasi,
);

export default router;
