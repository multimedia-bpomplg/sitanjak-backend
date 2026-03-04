import { Router } from "express";
import {
  getFormasi,
  getPrediksiFormasi,
  getSelesaiMagang,
} from "../controllers/formasiController";

const router = Router();

router.get("/", getFormasi);
router.get("/prediksi", getPrediksiFormasi);
router.get("/selesai-magang", getSelesaiMagang);

export default router;
