import { Router } from "express";
import {
  activateMaintenance,
  deactivateMaintenance,
  getMaintenanceStatus,
} from "../controllers/maintenanceController";

import { authMiddleware } from "../middlewares/auth.middleware";
import { coreGatewayGuard } from "../middlewares/coreGateway.guard";

const router = Router();

router.get("/status", getMaintenanceStatus);

router.post("/activate", authMiddleware, coreGatewayGuard, activateMaintenance);

router.post(
  "/deactivate",
  authMiddleware,
  coreGatewayGuard,
  deactivateMaintenance,
);

export default router;
