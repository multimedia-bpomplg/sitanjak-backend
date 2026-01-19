import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

/**
 * Middleware Role Based Access Control
 * @param allowedRoles role yang diizinkan
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !user.roles) {
      return res.status(403).json({
        message: "Akses ditolak (role tidak ditemukan)",
      });
    }

    const hasAccess = user.roles.some((role: string) =>
      allowedRoles.includes(role),
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke resource ini",
      });
    }

    next();
  };
};
