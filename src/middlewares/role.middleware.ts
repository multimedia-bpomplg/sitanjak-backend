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

    const hasAccess = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasAccess) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses",
      });
    }

    next();
  };
};
