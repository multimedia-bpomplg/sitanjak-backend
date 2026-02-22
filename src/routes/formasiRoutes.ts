import { Router } from "express";
import {
  getFormasi,
  getPrediksiFormasi,
} from "../controllers/formasiController";

const router = Router();

router.get("/", getFormasi);
router.get("/prediksi", getPrediksiFormasi);

export default router;
