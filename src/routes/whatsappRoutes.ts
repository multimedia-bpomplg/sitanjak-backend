import { Router } from "express";
import { WhatsappController } from "../controllers/WhatsappController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();
const whatsappController = new WhatsappController();

// Public route - tidak perlu auth
router.get("/active", (req, res) =>
  whatsappController.getActiveWhatsapp(req, res),
);

// =============================
// Protected routes
// =============================

router.put(
  "/update",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  (req, res) => whatsappController.updateWhatsapp(req, res),
);

router.get(
  "/all",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  (req, res) => whatsappController.getAllWhatsapp(req, res),
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  (req, res) => whatsappController.deleteWhatsapp(req, res),
);

// =============================
// WhatsApp Gateway
// =============================

// Ambil QR Code
router.get(
  "/qr",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  (req, res) => whatsappController.getWhatsappQR(req, res),
);

// Reconnect WhatsApp
router.post(
  "/reconnect",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  (req, res) => whatsappController.reconnectWhatsapp(req, res),
);

router.get(
  "/groups",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  (req, res) => whatsappController.getWhatsappGroups(req, res),
);

router.post(
  "/set-group",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  (req, res) => whatsappController.setWhatsappGroup(req, res),
);

export default router;
