import { Router } from "express";
import { upload } from "../middlelwares/upload.middleware";
import {
  createPendaftaran,
  getAllPendaftaran,
  cekPendaftaran,
  updateStatus,
} from "../controllers/pendaftaran.controller";

const router = Router();

router.post("/", upload.single("surat"), createPendaftaran);
router.get("/", getAllPendaftaran);
router.get("/cek", cekPendaftaran);
router.put("/:id", updateStatus);
router.put(
  "/:id",
  upload.single("suratBalasan"),
  updateStatus
);


export default router;
