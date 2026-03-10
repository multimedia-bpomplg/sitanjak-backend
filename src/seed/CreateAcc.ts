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

  /* ===============================
     1️⃣ PASTIKAN ROLE ADA
  =============================== */
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

  /* ===============================
     2️⃣ DATA USER
  =============================== */
  const users = [
    {
      email: "rifali.andi@gmail.com",
      role: "superadmin",
      password: "AhlinyasuperadminDariBpom2026",
      isSuperAccess: true,
    },
    {
      email: "midarwati.bpom@gmail.com",
      role: "superadmin",
      password: "Ahlinyasuperadminmenjadihebatdaribpom2026",
      isSuperAccess: true,
    },
    {
      email: "dyt343@gmail.com",
      role: "superadmin",
      password: "1234567890",
      isSuperAccess: true,
    },
    {
      email: "admin@gmail.com",
      role: "admin",
      password: "1234567890",
      isSuperAccess: false,
    },
    {
      email: "mentor@gmail.com",
      role: "mentor",
      password: "1234567890",
      isSuperAccess: false,
    },
    {
      email: "peserta@gmail.com",
      role: "peserta",
      password: "1234567890",
      isSuperAccess: false,
    },
  ];

  /* ===============================
     3️⃣ CREATE / UPDATE USER
  =============================== */
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);

    const exist = await User.findOne({ email: u.email });

    if (!exist) {
      await User.create({
        name: `${u.role} user`,
        email: u.email,
        password: hashed,
        roles: [roleMap[u.role]._id],
        isSuperAccess: u.isSuperAccess, // 🔥 TAMBAHKAN INI
      });

      console.log(`
User dibuat:
Email          : ${u.email}
Password       : ${u.password}
Role           : ${u.role}
Super Access   : ${u.isSuperAccess}
------------------------`);
    } else {
      // 🔥 Jika sudah ada → update agar superadmin dapat super access
      await User.updateOne(
        { email: u.email },
        {
          $set: {
            roles: [roleMap[u.role]._id],
            isSuperAccess: u.isSuperAccess,
          },
        },
      );

      console.log(`User diupdate: ${u.email}`);
    }
  }

  console.log("Seed akun & role selesai ✅");
  process.exit(0);
};

run();
