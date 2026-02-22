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

// Protected routes - butuh auth dan role superadmin/admin
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

export default router;
