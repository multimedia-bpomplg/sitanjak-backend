import express from "express";
import { register, login } from "../controllers/authController";
import {
  requestLupaPassword,
  verifyOtpLupaPassword,
  resetPasswordLupa,
} from "../controllers/lupaPassword.controller";
import {
  requestOtpLogin,
  verifyOtpLogin,
} from "../controllers/otpLogin.controller";

import {
  otpRequestLimiter,
  otpVerifyLimiter,
  globalIpLimiter,
} from "../middlewares/rateLimiter.middleware";

import {
  bruteForceProtection,
  LOGIN_ATTEMPT_TYPES,
} from "../middlewares/bruteForce.middleware";
import { superadminCoreLogin } from "../controllers/superadminController";

const router = express.Router();

router.post("/core-login", superadminCoreLogin);
/* ===============================
   AUTH
================================= */

router.post("/register", register);
router.post("/login", login);

/* ===============================
   LUPA PASSWORD
================================= */

router.post("/lupa-password/request", requestLupaPassword);
router.post("/lupa-password/verify-otp", verifyOtpLupaPassword);
router.post("/lupa-password/reset", resetPasswordLupa);

/* ===============================
   LOGIN DENGAN OTP
================================= */

router.post(
  "/login-otp/request",
  globalIpLimiter,
  otpRequestLimiter,
  bruteForceProtection(LOGIN_ATTEMPT_TYPES.REQUEST_OTP, {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  }),
  requestOtpLogin,
);

router.post(
  "/login-otp/verify",
  globalIpLimiter,
  otpVerifyLimiter,
  bruteForceProtection(LOGIN_ATTEMPT_TYPES.VERIFY_OTP, {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 60 * 60 * 1000,
  }),
  verifyOtpLogin,
);

export default router;
