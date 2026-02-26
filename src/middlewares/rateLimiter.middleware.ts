import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { MongoStore } from "../utils/rateLimitStore";

// Rate limiter untuk request OTP (per email)
export const otpRequestLimiter = rateLimit({
  store: new MongoStore("otp_request", 60 * 60 * 1000), // 1 jam
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => {
    return req.body.email || "unknown";
  },
  message: {
    message: "Terlalu banyak permintaan OTP. Silakan coba lagi dalam 1 jam.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Rate limiter untuk verifikasi OTP (per email)
export const otpVerifyLimiter = rateLimit({
  store: new MongoStore("otp_verify", 15 * 60 * 1000), // 15 menit
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => {
    return req.body.email || "unknown";
  },
  message: {
    message:
      "Terlalu banyak percobaan verifikasi. Silakan coba lagi dalam 15 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Rate limiter berdasarkan IP (global)
export const globalIpLimiter = rateLimit({
  store: new MongoStore("ip_global", 15 * 60 * 1000), // 15 menit
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || "unknown";
  },
  message: {
    message: "Terlalu banyak request dari IP ini. Silakan coba lagi nanti.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
