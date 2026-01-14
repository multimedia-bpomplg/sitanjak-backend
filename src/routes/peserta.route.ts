import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getPesertaMe,
  gantiPasswordPeserta,
} from "../controllers/pesertaController";

const router = Router();

router.get("/me", authMiddleware, getPesertaMe);
router.put("/ganti-password", authMiddleware, gantiPasswordPeserta);

export default router;
