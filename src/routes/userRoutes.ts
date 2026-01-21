import { Router } from "express";
import { getUserByEmail } from "../controllers/userController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/by-email/:email", authMiddleware, getUserByEmail);

export default router;
