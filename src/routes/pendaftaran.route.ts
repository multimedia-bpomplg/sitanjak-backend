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
  setMentorPendaftaran,
} from "../controllers/pendaftaran.controller";

const router = Router();

/* CREATE PENDAFTARAN */
router.post(
  "/",
  uploadSuratPengantar.single("suratPengantar"),
  createPendaftaran
);

/* GET */
router.get("/", getAllPendaftaran);
router.get("/cek", cekPendaftaran);

/* UPDATE STATUS + SURAT BALASAN */
router.put("/:id", uploadSuratBalasan.single("suratBalasan"), updateStatus);

/* SET MENTOR */
router.put("/:id/mentor", setMentorPendaftaran);

export default router;
