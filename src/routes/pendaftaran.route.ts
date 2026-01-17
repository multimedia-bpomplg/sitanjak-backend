import { Router } from "express";
import {
  uploadSuratPengantar,
  uploadSuratBalasan,
} from "../middlewares/upload.middleware";
import {
  createPendaftaran,
  getAllPendaftaran,
  cekPendaftaran,
  updateStatus,
  setMentorPeserta,
} from "../controllers/pendaftaran.controller";

const router = Router();

/* CREATE */
router.post(
  "/",
  uploadSuratPengantar.single("suratPengantar"),
  createPendaftaran
);

/* READ */
router.get("/", getAllPendaftaran);
router.get("/cek", cekPendaftaran);

/* UPDATE STATUS */
router.put("/:id", uploadSuratBalasan.single("suratBalasan"), updateStatus);

/* SET MENTOR PER PESERTA */
router.put("/:id/mentor-peserta", setMentorPeserta);

export default router;
