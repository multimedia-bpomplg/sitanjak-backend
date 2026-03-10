import { Request, Response } from "express";
import mongoose from "mongoose";
import Whatsapp from "../models/Whatsapp";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  getQR,
  getStatus,
  startWhatsapp,
  getWhatsappGroups,
  resetWhatsappSession,
} from "../utils/whatsappClient";

export class WhatsappController {
  /**
   * =====================================
   * Get Active WhatsApp Number
   * =====================================
   */
  async getActiveWhatsapp(req: Request, res: Response) {
    try {
      const whatsapp = await Whatsapp.findOne({ isActive: true })
        .select("phoneNumber updatedAt groupId groupName")
        .populate("updatedBy", "name email");

      return res.status(200).json({
        success: true,
        data: whatsapp || null,
      });
    } catch (error) {
      console.error("❌ ERROR getActiveWhatsapp:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal mengambil nomor WhatsApp",
      });
    }
  }

  /**
   * =====================================
   * Get All WhatsApp Numbers
   * =====================================
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
      console.error("❌ ERROR getAllWhatsapp:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data WhatsApp",
      });
    }
  }

  /**
   * =====================================
   * Update WhatsApp Number
   * =====================================
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
          message: "Format nomor harus diawali 08",
        });
      }

      const internationalNumber = "62" + phoneNumber.substring(1);

      let whatsapp = await Whatsapp.findOne({
        phoneNumber: internationalNumber,
      });

      if (whatsapp) {
        whatsapp.isActive = true;
        whatsapp.updatedBy = userId;

        await whatsapp.save();

        // RESET SESSION
        await resetWhatsappSession();
      } else {
        whatsapp = new Whatsapp({
          phoneNumber: internationalNumber,
          isActive: true,
          updatedBy: userId,
        });

        await whatsapp.save();

        // RESET SESSION
        await resetWhatsappSession();
      }

      const populatedWhatsapp = await Whatsapp.findById(whatsapp._id).populate(
        "updatedBy",
        "name email",
      );

      return res.status(200).json({
        success: true,
        message: "Nomor WhatsApp berhasil diperbarui",
        data: populatedWhatsapp,
      });
    } catch (error) {
      console.error("❌ ERROR updateWhatsapp:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal memperbarui nomor WhatsApp",
      });
    }
  }

  /**
   * =====================================
   * Delete WhatsApp Number
   * =====================================
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

      // reset session setelah nomor dihapus
      await resetWhatsappSession();

      return res.status(200).json({
        success: true,
        message: "Nomor WhatsApp berhasil dihapus",
      });
    } catch (error) {
      console.error("❌ ERROR deleteWhatsapp:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal menghapus nomor WhatsApp",
      });
    }
  }

  /**
   * =====================================
   * Get WhatsApp QR
   * =====================================
   */
  async getWhatsappQR(req: AuthRequest, res: Response) {
    try {
      const qr = getQR();
      const status = getStatus();

      return res.status(200).json({
        success: true,
        qr,
        status,
      });
    } catch (error) {
      console.error("❌ ERROR getWhatsappQR:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal mengambil QR WhatsApp",
      });
    }
  }

  /**
   * =====================================
   * Reconnect WhatsApp
   * =====================================
   */
  async reconnectWhatsapp(req: AuthRequest, res: Response) {
    try {
      await startWhatsapp();

      return res.status(200).json({
        success: true,
        message: "Reconnect WhatsApp berhasil",
      });
    } catch (error) {
      console.error("❌ ERROR reconnectWhatsapp:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal reconnect WhatsApp",
      });
    }
  }

  /**
   * =====================================
   * Get WhatsApp Groups
   * =====================================
   */
  async getWhatsappGroups(req: AuthRequest, res: Response) {
    try {
      const groups = await getWhatsappGroups();

      return res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      console.error("❌ ERROR getWhatsappGroups:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal mengambil daftar group WhatsApp",
      });
    }
  }

  /**
   * =====================================
   * Set WhatsApp Group
   * =====================================
   */
  async setWhatsappGroup(req: AuthRequest, res: Response) {
    try {
      const { groupId, groupName } = req.body;

      if (!groupId || !groupName) {
        return res.status(400).json({
          success: false,
          message: "Group ID dan Group Name wajib diisi",
        });
      }

      const whatsapp = await Whatsapp.findOne({ isActive: true });

      if (!whatsapp) {
        return res.status(404).json({
          success: false,
          message: "Nomor WhatsApp aktif tidak ditemukan",
        });
      }

      // Update field grup di database
      whatsapp.groupId = groupId;
      whatsapp.groupName = groupName;

      await whatsapp.save();

      return res.json({
        success: true,
        message: "Grup WhatsApp berhasil disimpan",
        data: {
          groupId: whatsapp.groupId,
          groupName: whatsapp.groupName,
        },
      });
    } catch (error) {
      console.error("❌ ERROR setWhatsappGroup:", error);

      return res.status(500).json({
        success: false,
        message: "Gagal menyimpan grup WhatsApp",
      });
    }
  }
}
