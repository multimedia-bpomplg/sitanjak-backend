import { Router } from "express";

const router = Router();

router.get("/test", (req, res) => {
  res.json({ message: "API route test successful!" });
});

export default router;
