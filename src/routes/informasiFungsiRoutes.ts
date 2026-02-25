import express from "express";
import {
  getAllInformasi,
  createInformasi,
  updateInformasi,
  deleteInformasi,
} from "../controllers/informasiFungsi.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = express.Router();

/* PUBLIC */
router.get("/", getAllInformasi);

/* ADMIN & SUPERADMIN */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  createInformasi,
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  updateInformasi,
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteInformasi,
);

export default router;
