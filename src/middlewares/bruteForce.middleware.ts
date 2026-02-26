import { Request, Response, NextFunction } from "express";
import LoginAttempt from "../models/LoginAttempt";

/* ===============================
   CONSTANT TYPES (ANTI TYPO)
================================= */

export const LOGIN_ATTEMPT_TYPES = {
  REQUEST_OTP: "request_otp",
  VERIFY_OTP: "verify_otp",
  LOGIN_PASSWORD: "login_password",
} as const;

export type LoginAttemptType =
  | typeof LOGIN_ATTEMPT_TYPES.REQUEST_OTP
  | typeof LOGIN_ATTEMPT_TYPES.VERIFY_OTP
  | typeof LOGIN_ATTEMPT_TYPES.LOGIN_PASSWORD;

/* ===============================
   CONFIG
================================= */

interface BruteForceConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

const defaultConfig: BruteForceConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 30 * 60 * 1000,
};

/* ===============================
   BLOCK CACHE (IN MEMORY)
================================= */

const blockedCache = new Map<
  string,
  { blockedUntil: Date; attempts: number }
>();

setInterval(
  () => {
    const now = new Date();
    for (const [key, value] of blockedCache.entries()) {
      if (value.blockedUntil < now) {
        blockedCache.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

/* ===============================
   MIDDLEWARE
================================= */

export const bruteForceProtection = (
  type: LoginAttemptType,
  config: Partial<BruteForceConfig> = {},
) => {
  const { maxAttempts, windowMs, blockDurationMs } = {
    ...defaultConfig,
    ...config,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.body.email;
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

      if (!email) return next();

      const emailKey = `email:${email}`;
      const ipKey = `ip:${ipAddress}`;

      /* ===============================
         CHECK BLOCK CACHE
      ================================= */

      const emailBlocked = blockedCache.get(emailKey);
      if (emailBlocked && emailBlocked.blockedUntil > new Date()) {
        const remainingTime = Math.ceil(
          (emailBlocked.blockedUntil.getTime() - Date.now()) / 60000,
        );

        return res.status(429).json({
          message: `Akun diblokir sementara. Coba lagi dalam ${remainingTime} menit.`,
        });
      }

      const ipBlocked = blockedCache.get(ipKey);
      if (ipBlocked && ipBlocked.blockedUntil > new Date()) {
        const remainingTime = Math.ceil(
          (ipBlocked.blockedUntil.getTime() - Date.now()) / 60000,
        );

        return res.status(429).json({
          message: `IP diblokir sementara. Coba lagi dalam ${remainingTime} menit.`,
        });
      }

      /* ===============================
         COUNT FAILED ATTEMPTS
      ================================= */

      const windowStart = new Date(Date.now() - windowMs);

      const failedAttempts = await LoginAttempt.countDocuments({
        email,
        attemptType: type,
        success: false,
        createdAt: { $gte: windowStart },
      });

      if (failedAttempts >= maxAttempts) {
        const blockedUntil = new Date(Date.now() + blockDurationMs);

        blockedCache.set(emailKey, {
          blockedUntil,
          attempts: failedAttempts,
        });

        blockedCache.set(ipKey, {
          blockedUntil,
          attempts: failedAttempts,
        });

        return res.status(429).json({
          message: `Terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil(
            blockDurationMs / 60000,
          )} menit.`,
        });
      }

      /* ===============================
         ATTACH RECORD FUNCTION
      ================================= */

      (req as any).recordAttempt = async (success: boolean) => {
        await LoginAttempt.create({
          email,
          ipAddress,
          attemptType: type,
          success,
        });

        if (success) {
          blockedCache.delete(emailKey);
          blockedCache.delete(ipKey);
        }
      };

      next();
    } catch (error) {
      console.error("Brute force middleware error:", error);
      next();
    }
  };
};
