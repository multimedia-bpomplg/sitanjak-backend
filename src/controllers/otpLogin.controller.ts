import { Request, Response } from "express";
import User from "../models/User";
import Otp from "../models/Otp";
import LoginAttempt from "../models/LoginAttempt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOtpLoginEmail } from "../utils/otplogin";

/* =====================================================
   UTILITIES
===================================================== */

const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const generateDeviceFingerprint = (req: Request): string => {
  const userAgent = req.headers["user-agent"] || "unknown";
  const acceptLang = req.headers["accept-language"] || "unknown";
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  return crypto
    .createHash("sha256")
    .update(`${userAgent}|${acceptLang}|${ip}`)
    .digest("hex");
};

/* =====================================================
   REQUEST OTP LOGIN
===================================================== */

export const requestOtpLogin = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const deviceFingerprint = generateDeviceFingerprint(req);

    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Format email tidak valid" });
    }

    const user = await User.findOne({ email }).populate("roles");

    if (!user) {
      await LoginAttempt.create({
        email,
        ipAddress,
        attemptType: "request_otp",
        success: false,
      });

      return res.status(200).json({
        message: "Jika email terdaftar, kode OTP akan dikirim",
      });
    }

    if (user.status === "Nonaktif") {
      return res.status(403).json({
        message: "Akun Anda Nonaktif",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentRequests = await Otp.countDocuments({
      email,
      type: "login",
      createdAt: { $gte: oneHourAgo },
    });

    if (recentRequests >= 5) {
      return res.status(429).json({
        message:
          "Terlalu banyak permintaan OTP. Silakan coba lagi dalam 1 jam.",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({
      email,
      type: "login",
      used: false,
      expiresAt: { $lt: new Date() },
    });

    await Otp.create({
      email,
      otp,
      type: "login",
      expiresAt,
      deviceFingerprint,
      used: false,
      attempts: 0,
    });

    // Kirim email via util
    await sendOtpLoginEmail({
      email,
      otp,
      ipAddress,
    });

    await LoginAttempt.create({
      email,
      ipAddress,
      attemptType: "request_otp",
      success: true,
    });

    if ((req as any).recordAttempt) {
      await (req as any).recordAttempt(true);
    }

    return res.json({
      message: "Kode OTP telah dikirim ke email Anda",
    });
  } catch (error: any) {
    console.error("=== OTP REQUEST ERROR ===");
    console.error(error);
    console.error(error?.stack);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* =====================================================
   VERIFY OTP LOGIN
===================================================== */

export const verifyOtpLogin = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const deviceFingerprint = generateDeviceFingerprint(req);

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email dan OTP wajib diisi",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Format OTP tidak valid",
      });
    }

    const user = await User.findOne({ email }).populate("roles");

    if (!user) {
      return res.status(404).json({
        message: "Email tidak terdaftar",
      });
    }

    const otpRecord = await Otp.findOne({
      email,
      type: "login",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    let isOtpValid = false;

    if (otpRecord) {
      const otpBuffer = Buffer.from(otpRecord.otp);
      const inputBuffer = Buffer.from(otp);

      if (otpBuffer.length === inputBuffer.length) {
        isOtpValid = crypto.timingSafeEqual(otpBuffer, inputBuffer);
      }
    }

    if (!otpRecord || !isOtpValid) {
      return res.status(400).json({
        message: "Kode OTP tidak valid",
      });
    }

    otpRecord.used = true;
    await otpRecord.save();

    const roleNames = user.roles.map((r: any) => r.name);

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        roles: roleNames,
        loginMethod: "otp",
        deviceFingerprint,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" },
    );

    await Otp.deleteMany({
      email,
      type: "login",
      used: false,
    });

    return res.json({
      token,
      roles: roleNames,
      message: "Login berhasil",
    });
  } catch (error: any) {
    console.error("=== OTP VERIFY ERROR ===");
    console.error(error);
    console.error(error?.stack);

    return res.status(500).json({
      message: "Server error",
    });
  }
};
