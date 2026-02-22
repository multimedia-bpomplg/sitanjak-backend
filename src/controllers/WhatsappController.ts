import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import { AuthRequest } from "../middlewares/auth.middleware";
import mongoose from "mongoose";

export class WhatsappController {
  /**
   * Get active WhatsApp number
   */
  async getActiveWhatsapp(req: Request, res: Response) {
    try {
      const whatsapp = await Whatsapp.findOne({ isActive: true })
        .select("phoneNumber updatedAt")
        .populate("updatedBy", "name email");

      return res.status(200).json({
        success: true,
        data: whatsapp || {
          phoneNumber: "6288274133623",
          isDefault: true,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil nomor WhatsApp",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all WhatsApp numbers
   */
  async getAllWhatsapp(req: AuthRequest, res: Response) {
    try {
      const whatsapps = await Whatsapp.find()
        .sort({ isActive: -1, createdAt: -1 })
        .populate("updatedBy", "name email");

      return res.status(200).json({
        success: true,
        data: whatsapps,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data WhatsApp",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Create or update WhatsApp number
   */
  async updateWhatsapp(req: AuthRequest, res: Response) {
    try {
      const { phoneNumber } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Nomor WhatsApp wajib diisi",
        });
      }

      const phoneRegex = /^08\d{8,11}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Format nomor harus diawali 08 dan minimal 10 digit",
        });
      }

      // Convert 08 → 62
      const internationalNumber = "62" + phoneNumber.substring(1);

      let whatsapp = await Whatsapp.findOne({
        phoneNumber: internationalNumber,
      });

      if (whatsapp) {
        // Jika sudah ada → aktifkan kembali
        whatsapp.isActive = true;
        whatsapp.updatedBy = userId;
        await whatsapp.save();
      } else {
        // Jika belum ada → buat baru
        whatsapp = new Whatsapp({
          phoneNumber: internationalNumber,
          isActive: true,
          updatedBy: userId,
        });

        await whatsapp.save();
      }

      const populatedWhatsapp = await Whatsapp.findById(whatsapp._id).populate(
        "updatedBy",
        "name email",
      );

      return res.status(200).json({
        success: true,
        message: "Nomor WhatsApp berhasil diperbarui",
        data: {
          phoneNumber: populatedWhatsapp?.phoneNumber,
          updatedAt: populatedWhatsapp?.updatedAt,
          updatedBy: populatedWhatsapp?.updatedBy,
        },
      });
    } catch (error) {
      console.error("❌ ERROR updateWhatsapp:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal memperbarui nomor WhatsApp",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete WhatsApp number
   */
  async deleteWhatsapp(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "ID tidak valid",
        });
      }

      const whatsapp = await Whatsapp.findById(id);

      if (!whatsapp) {
        return res.status(404).json({
          success: false,
          message: "Data tidak ditemukan",
        });
      }

      // Jika yang dihapus adalah nomor aktif
      if (whatsapp.isActive) {
        const anotherWhatsapp = await Whatsapp.findOne({
          _id: { $ne: id },
        });

        if (anotherWhatsapp) {
          anotherWhatsapp.isActive = true;
          await anotherWhatsapp.save();
        }
      }

      await whatsapp.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Nomor WhatsApp berhasil dihapus",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal menghapus nomor WhatsApp",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
