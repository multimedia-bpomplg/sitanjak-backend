import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !user.roles) {
      return res.status(403).json({
        message: "Akses ditolak (role tidak ditemukan)",
      });
    }

    // Admin dengan super access bisa akses semua route
    if (user.isSuperAccess === true && user.roles.includes("admin")) {
      return next();
    }

    // Jika route superadmin, admin dengan super access tetap bisa akses
    if (allowedRoles.includes("superadmin") && user.isSuperAccess === true) {
      return next();
    }

    const hasAccess = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasAccess) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke resource ini",
      });
    }

    next();
  };
};
