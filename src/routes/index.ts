import { Router } from "express";
import authRoutes from "./authRoutes";
import superadminRoutes from "./superadminRoutes";
import pendaftaranRoutes from "./pendaftaran.route";
import mentorRoutes from "./mentor.route";

const router = Router();

/* TEST ROUTE */
router.get("/test", (req, res) => {
  res.json({ message: "API route test successful!" });
});

/* ROUTE GROUP */
router.use("/auth", authRoutes);
router.use("/superadmin", superadminRoutes);
router.use("/pendaftaran", pendaftaranRoutes);
router.use("/mentor", mentorRoutes);

export default router;
