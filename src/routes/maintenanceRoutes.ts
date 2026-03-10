import { Router } from "express";
import {
  activateMaintenance,
  deactivateMaintenance,
  getMaintenanceStatus,
} from "../controllers/maintenanceController";

import { authMiddleware } from "../middlewares/auth.middleware";
import { coreGatewayGuard } from "../middlewares/coreGateway.guard";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

router.get("/status", getMaintenanceStatus);

// 🔒 hanya superadmin
router.post(
  "/activate",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  coreGatewayGuard,
  activateMaintenance,
);

// 🔒 hanya superadmin
router.post(
  "/deactivate",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  coreGatewayGuard,
  deactivateMaintenance,
);

export default router;
