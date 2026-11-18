import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getMyEvaluasi,
  upsertMyEvaluasi,
} from "../controllers/evaluasiController";

const router = Router();

router.get("/me", authMiddleware, getMyEvaluasi);
router.put("/me", authMiddleware, upsertMyEvaluasi);

export default router;
