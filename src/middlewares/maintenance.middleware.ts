import { Request, Response, NextFunction } from "express";
import Maintenance from "../models/Maintenance";

export const maintenanceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const maintenance = await Maintenance.findOne();

  if (!maintenance) {
    return next();
  }

  // 🔥 Jangan return 503 lagi
  (req as any).maintenanceActive = maintenance.isActive;
  (req as any).maintenanceEnd = maintenance.endTime;

  next();
};
