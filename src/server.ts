import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import chalk from "chalk";
import boxen from "boxen";
import path from "path";

import router from "./routes";
import { connectDB } from "./config/database";
import authRoutes from "./routes/authRoutes";
import pendaftaranRoute from "./routes/pendaftaran";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use("/api", router);

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/pendaftaran", pendaftaranRoute);

// STATIC FILE (PDF, surat, gambar)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// START SERVER
app.listen(PORT, async () => {
  await connectDB();

  const time = new Date().toLocaleTimeString();
  const mode =
    process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT";

  const msg = `
    🚀 BPOM Internship API Server
    Status     : RUNNING
    Database   : MongoDB Connected
    Mode       : ${mode}
    Port       : ${PORT}
    Started At : ${time}
  `;

  console.log(
    boxen(msg, {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
      backgroundColor: "#0f172a",
    })
  );
});
