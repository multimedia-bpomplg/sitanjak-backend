import { Router } from "express";
import { upload } from "../middlewares/upload.middleware";
import {
  createPendaftaran,
  getAllPendaftaran,
  cekPendaftaran,
  updateStatus,
} from "../controllers/pendaftaran.controller";
import { setMentorPendaftaran } from "../controllers/pendaftaran.controller";

const router = Router();

router.post("/", upload.single("surat"), createPendaftaran);
router.get("/", getAllPendaftaran);
router.get("/cek", cekPendaftaran);
router.put("/:id", upload.single("suratBalasan"), updateStatus);
router.put("/:id/mentor", setMentorPendaftaran);

export default router;
