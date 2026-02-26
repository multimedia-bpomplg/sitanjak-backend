import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";

export const coreController = async (req: AuthRequest, res: Response) => {
  try {
    // Extra audit log
    console.info(
      `[CORE ACCESS] ${req.user?.email} at ${new Date().toISOString()}`,
    );

    return res.status(200).json({
      message: "Core gateway access granted",
      user: {
        id: req.user?.id,
        email: req.user?.email,
        roles: req.user?.roles,
      },
    });
  } catch (error) {
    console.error("[CORE ERROR]", error);
    return res.status(500).json({
      message: "Core system error",
    });
  }
};
