import { Request, Response } from "express";
import User from "../models/User";

export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email diperlukan" });
    }

    const user = await User.findOne({ email }).select("_id name email");

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json(user);
  } catch (error) {
    console.error("[GET USER BY EMAIL]", error);
    res.status(500).json({ message: "Gagal mengambil data user" });
  }
};
