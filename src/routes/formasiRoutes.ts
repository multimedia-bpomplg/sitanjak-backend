import { Router } from "express";
import { getFormasi } from "../controllers/formasiController";

const router = Router();

router.get("/", getFormasi);

export default router;
