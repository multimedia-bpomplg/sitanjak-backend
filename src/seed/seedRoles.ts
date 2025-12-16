import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../config/database";
import Role from "../models/Role";

const run = async () => {
  await connectDB();

  const roles = ["superadmin", "admin", "mentor", "peserta"];

  for (const name of roles) {
    const exists = await Role.findOne({ name });
    if (!exists) {
      await Role.create({ name, description: `${name} role` });
      console.log(`Role ${name} dibuat`);
    }
  }

  process.exit(0);
};

run();
