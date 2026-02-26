import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const coreGatewayGuard = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized - User tidak ditemukan",
    });
  }

  const { roles, isSuperAccess } = req.user;

  // 🔒 WAJIB SUPERADMIN
  if (!roles.includes("superadmin")) {
    return res.status(403).json({
      message: "Forbidden - Superadmin Only",
    });
  }

  // 🔥 OPTIONAL EXTRA LAYER
  if (!isSuperAccess) {
    return res.status(403).json({
      message: "Forbidden - Super Access Required",
    });
  }

  next();
};
