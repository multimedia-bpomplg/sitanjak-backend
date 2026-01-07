import express from "express";
import { register, login } from "../controllers/authController";
import {
  requestLupaPassword,
  verifyOtpLupaPassword,
  resetPasswordLupa,
} from "../controllers/lupaPassword.controller";

const router = express.Router();

/* AUTH */
router.post("/register", register);
router.post("/login", login);

/* LUPA PASSWORD (OTP FLOW) */
router.post("/lupa-password/request", requestLupaPassword);
router.post("/lupa-password/verify-otp", verifyOtpLupaPassword);
router.post("/lupa-password/reset", resetPasswordLupa);

export default router;
