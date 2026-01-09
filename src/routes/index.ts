import { Router } from "express";
import authRoutes from "./authRoutes";
import superadminRoutes from "./superadminRoutes";
import pendaftaranRoutes from "./pendaftaran.route";
import mentorRoutes from "./mentor.route";
import logbookRoutes from "./logbook.routes";

const router = Router();

/* TEST */
router.get("/test", (req, res) => {
  res.json({ message: "API route test successful!" });
});

/* ROUTES */
router.use("/auth", authRoutes);
router.use("/superadmin", superadminRoutes);
router.use("/pendaftaran", pendaftaranRoutes);
router.use("/mentor", mentorRoutes);
router.use("/logbook", logbookRoutes); // 🔥 INI YANG HILANG

export default router;
