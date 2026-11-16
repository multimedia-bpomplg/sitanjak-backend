import { Request, Response } from "express";
import Maintenance from "../models/Maintenance";
import User from "../models/User";

export const activateMaintenance = async (req: any, res: Response) => {
  const { durationMinutes, email, manual } = req.body;

  const user = await User.findOne({ email }).populate("roles");

  if (!user) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  const isSuperadmin = user.roles.some((r: any) => r.name === "superadmin");

  if (!isSuperadmin) {
    return res.status(403).json({ message: "Email bukan superadmin" });
  }

  if (!user.isSuperAccess) {
    return res.status(403).json({ message: "Super access required" });
  }

  const now = new Date();

  let end: Date | null = null;
  let isManual = false;

  if (manual) {
    isManual = true;
  } else {
    end = new Date(now.getTime() + durationMinutes * 60000);
  }

  let maintenance = await Maintenance.findOne();

  if (!maintenance) {
    maintenance = await Maintenance.create({});
  }

  maintenance.isActive = true;
  maintenance.isManual = isManual;
  maintenance.startTime = now;
  maintenance.endTime = end;
  maintenance.activatedBy = user.email;

  maintenance.history.push({
    startTime: now,
    endTime: end,
    activatedBy: user.email,
    durationMinutes: manual ? null : durationMinutes,
    isManual,
  });

  await maintenance.save();

  res.json({
    message: "Maintenance Activated",
    manual: isManual,
    endTime: end,
  });
};

export const deactivateMaintenance = async (req: any, res: Response) => {
  const maintenance = await Maintenance.findOne();

  if (!maintenance) {
    return res.status(404).json({ message: "No maintenance data" });
  }

  const now = new Date();
  if (maintenance.history.length > 0) {
    const lastEntry = maintenance.history[maintenance.history.length - 1];
    if (!lastEntry.endTime || new Date(lastEntry.endTime) > now) {
      lastEntry.endTime = now;
    }
  }

  maintenance.isActive = false;
  maintenance.startTime = null;
  maintenance.endTime = null;
  maintenance.isManual = false; // 🔥 reset
  maintenance.activatedBy = null;

  await maintenance.save();

  res.json({ message: "Maintenance Deactivated" });
};

export const getMaintenanceStatus = async (req: Request, res: Response) => {
  const maintenance = await Maintenance.findOne();

  if (!maintenance) {
    return res.json({
      isActive: false,
      isManual: false,
      startTime: null,
      endTime: null,
      activatedBy: null,
      history: [],
    });
  }

  // ===============================
  // 🔥 AUTO NONAKTIF JIKA WAKTU HABIS
  // ===============================
  const now = new Date();
  if (
    maintenance.isActive &&
    !maintenance.isManual &&
    maintenance.endTime &&
    now > maintenance.endTime
  ) {
    if (maintenance.history.length > 0) {
      const lastEntry = maintenance.history[maintenance.history.length - 1];
      if (!lastEntry.endTime) {
        lastEntry.endTime = maintenance.endTime || now;
      }
    }

    maintenance.isActive = false;
    maintenance.startTime = null;
    maintenance.endTime = null;
    maintenance.isManual = false;
    maintenance.activatedBy = null;

    await maintenance.save();

    return res.json({
      isActive: false,
      isManual: false,
      startTime: null,
      endTime: null,
      activatedBy: null,
      history: maintenance.history,
    });
  }

  res.json({
    isActive: maintenance.isActive,
    isManual: maintenance.isManual,
    startTime: maintenance.startTime,
    endTime: maintenance.endTime,
    activatedBy: maintenance.activatedBy,
    history: maintenance.history,
  });
};
