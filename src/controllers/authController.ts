import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Role from "../models/Role";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email sudah terdaftar" });

    const hashed = await bcrypt.hash(password, 10);

    const roles = await Role.find({
      name: { $in: role ? [role] : ["peserta"] },
    });

    const user = await User.create({
      name,
      email,
      password: hashed,
      roles: roles.map((r) => r._id),
    });

    res.status(201).json({ message: "User berhasil dibuat", userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("roles");
    if (!user)
      return res.status(400).json({ message: "Email tidak ditemukan" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Password salah" });

    const roleNames = user.roles.map((r: any) => r.name);

    const token = jwt.sign(
      { userId: user._id, roles: roleNames },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1d" }
    );

    res.json({ token, roles: roleNames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
