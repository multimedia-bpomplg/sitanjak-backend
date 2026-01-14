import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import router from "./routes";
import { connectDB } from "./config/database";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* STATIC FILE */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* API ROUTES */
app.use("/api", router);

/* START SERVER */
app.listen(PORT, async () => {
  await connectDB();

  console.log("========================================");
  console.log("🚀 BPOM Internship API Server");
  console.log("Status     : RUNNING");
  console.log("Database   : MongoDB Connected");
  console.log(
    `Mode       : ${
      process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT"
    }`
  );
  console.log(`Port       : ${PORT}`);
  console.log(`Started At : ${new Date().toLocaleTimeString()}`);
});
``;
