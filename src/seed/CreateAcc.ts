import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { connectDB } from "../config/database";
import User from "../models/User";
import Role from "../models/Role";

const run = async () => {
  await connectDB();

  const roleNames = ["superadmin", "admin", "mentor", "peserta"];
  const roleMap: Record<string, any> = {};

  // 1. Pastikan role ada
  for (const name of roleNames) {
    let role = await Role.findOne({ name });
    if (!role) {
      role = await Role.create({
        name,
        description: `${name} role`,
      });
      console.log(`Role dibuat: ${name}`);
    }
    roleMap[name] = role;
  }

  // 2. Buat akun + password per role
  const users = [
    {
      email: "alisuperadmin@gmail.com",
      role: "superadmin",
      password: "1234567890",
    },
    { email: "admin@gmail.com", role: "admin", password: "1234567890" },
    { email: "mentor@gmail.com", role: "mentor", password: "1234567890" },
    { email: "peserta@gmail.com", role: "peserta", password: "1234567890" },
  ];

  for (const u of users) {
    const exist = await User.findOne({ email: u.email });
    if (!exist) {
      const hashed = await bcrypt.hash(u.password, 10);
      await User.create({
        name: `${u.role} user`,
        email: u.email,
        password: hashed,
        roles: [roleMap[u.role]._id],
      });

      console.log(`User dibuat:
Email    : ${u.email}
Password : ${u.password}
Role     : ${u.role}
------------------------`);
    } else {
      console.log(`User sudah ada: ${u.email}`);
    }
  }

  console.log("Seed akun & role selesai ✅");
  process.exit(0);
};

run();
