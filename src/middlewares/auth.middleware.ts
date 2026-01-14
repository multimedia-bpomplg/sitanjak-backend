import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    // 🔥 AUTO LOGOUT CHECK
    if (user.passwordChangedAt) {
      const pwdChangedTime = Math.floor(
        new Date(user.passwordChangedAt).getTime() / 1000
      );

      if (decoded.iat < pwdChangedTime) {
        return res.status(401).json({
          message: "Password telah diganti, silakan login ulang",
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
};
