import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const superFeatureMiddleware = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const isSuperAdmin = user.roles.includes("superadmin");
    const isPrivilegedAdmin =
      user.roles.includes("admin") && user.isSuperAccess;

    if (!isSuperAdmin && !isPrivilegedAdmin) {
      return res.status(403).json({
        message: "Fitur khusus superadmin",
      });
    }

    next();
  };
};
