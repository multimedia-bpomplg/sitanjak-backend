// controllers/whatsappController.ts
import { Request, Response } from "express";
import WhatsAppConfig from "../models/WhatsAppConfig";

/* ================= GET WHATSAPP CONFIG ================= */
export const getWhatsAppConfig = async (req: Request, res: Response) => {
  try {
    let config = await WhatsAppConfig.findOne();

    if (!config) {
      // Create default config
      config = await WhatsAppConfig.create({
        phoneNumber: "6288274133623",
        defaultMessage: "Halo, saya ingin bertanya tentang pendaftaran magang.",
        buttonText: "Chat WhatsApp",
        bubbleText: "Chat WhatsApp",
        isActive: true,
        showOnMobile: true,
        showOnDesktop: true,
        position: "bottom-right",
      });
    }

    res.json({
      id: config._id,
      phoneNumber: config.phoneNumber,
      defaultMessage: config.defaultMessage,
      buttonText: config.buttonText,
      bubbleText: config.bubbleText,
      isActive: config.isActive,
      showOnMobile: config.showOnMobile,
      showOnDesktop: config.showOnDesktop,
      position: config.position,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error("[GET WHATSAPP CONFIG ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil konfigurasi WhatsApp" });
  }
};

/* ================= UPDATE WHATSAPP CONFIG ================= */
export const updateWhatsAppConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let config = await WhatsAppConfig.findById(id);

    if (!config) {
      // Create new if not exists
      config = await WhatsAppConfig.create(updates);
    } else {
      // Update existing
      config = await WhatsAppConfig.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true },
      );
    }

    res.json({
      message: "Konfigurasi WhatsApp berhasil diperbarui",
      config: {
        id: config?._id,
        phoneNumber: config?.phoneNumber,
        defaultMessage: config?.defaultMessage,
        buttonText: config?.buttonText,
        bubbleText: config?.bubbleText,
        isActive: config?.isActive,
        showOnMobile: config?.showOnMobile,
        showOnDesktop: config?.showOnDesktop,
        position: config?.position,
        updatedAt: config?.updatedAt,
      },
    });
  } catch (error) {
    console.error("[UPDATE WHATSAPP CONFIG ERROR]", error);
    res.status(500).json({ message: "Gagal memperbarui konfigurasi WhatsApp" });
  }
};

/* ================= TOGGLE WHATSAPP ACTIVE ================= */
export const toggleWhatsAppActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const config = await WhatsAppConfig.findById(id);

    if (!config) {
      return res.status(404).json({ message: "Konfigurasi tidak ditemukan" });
    }

    const updatedConfig = await WhatsAppConfig.findByIdAndUpdate(
      id,
      { isActive: !config.isActive, updatedAt: new Date() },
      { new: true },
    );

    res.json({
      message: `WhatsApp Bubble ${updatedConfig?.isActive ? "diaktifkan" : "dinonaktifkan"}`,
      config: {
        id: updatedConfig?._id,
        isActive: updatedConfig?.isActive,
      },
    });
  } catch (error) {
    console.error("[TOGGLE WHATSAPP ERROR]", error);
    res.status(500).json({ message: "Gagal mengubah status WhatsApp" });
  }
};
