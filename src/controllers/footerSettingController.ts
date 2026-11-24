import { Request, Response } from "express";
import FooterSetting from "../models/FooterSetting";
import { AuthRequest } from "../middlewares/auth.middleware";

const FOOTER_SETTING_KEY = "landing-footer";

export const DEFAULT_FOOTER_CONTENT = {
  institutionName: "Balai Besar POM di Palembang",
  address: "Jl. Pangeran Ratu, 5 Ulu, Kota Palembang 30254",
  phone: "(0711) 510195",
  email: "bpom_palembang@pom.go.id",
  socialLinks: [
    {
      platform: "globe",
      label: "Website Resmi BPOM Palembang",
      href: "https://palembang.pom.go.id/",
    },
    {
      platform: "facebook",
      label: "Facebook BBPOM Palembang",
      href: "https://www.facebook.com/bpom.plg/",
    },
    {
      platform: "instagram",
      label: "Instagram @bpom.palembang",
      href: "https://www.instagram.com/bpom.palembang/",
    },
    {
      platform: "youtube",
      label: "YouTube BBPOM Palembang",
      href: "https://www.youtube.com/@bbpom_palembang",
    },
  ],
};

/* ================= GET FOOTER SETTING (PUBLIC) ================= */
export const getFooterSetting = async (_req: Request, res: Response) => {
  try {
    const doc = (await FooterSetting.findOne({ key: FOOTER_SETTING_KEY })
      .populate("updatedBy", "name email")
      .lean()) as Record<string, any> | null;

    if (!doc) {
      return res.json({
        success: true,
        data: {
          isCustom: false,
          ...DEFAULT_FOOTER_CONTENT,
          updatedBy: null,
          updatedAt: null,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        isCustom: true,
        institutionName:
          doc.institutionName || DEFAULT_FOOTER_CONTENT.institutionName,
        address: doc.address || DEFAULT_FOOTER_CONTENT.address,
        phone: doc.phone || DEFAULT_FOOTER_CONTENT.phone,
        email: doc.email || DEFAULT_FOOTER_CONTENT.email,
        socialLinks: Array.isArray(doc.socialLinks)
          ? doc.socialLinks
          : DEFAULT_FOOTER_CONTENT.socialLinks,
        updatedBy: doc.updatedBy || null,
        updatedAt: doc.updatedAt || null,
      },
    });
  } catch (error) {
    console.error("[GET FOOTER SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pengaturan footer & kontak",
    });
  }
};

/* ================= UPDATE FOOTER SETTING (SUPERADMIN) ================= */
export const updateFooterSetting = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};

    const institutionName = String(body.institutionName ?? "").trim();
    const address = String(body.address ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim();

    if (!institutionName || !address || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: "Nama instansi, alamat, nomor telepon, dan email wajib diisi",
      });
    }

    const rawSocials = Array.isArray(body.socialLinks) ? body.socialLinks : [];
    const socialLinks = rawSocials
      .map((item: any) => ({
        platform: String(item?.platform ?? "globe").trim() || "globe",
        label: String(item?.label ?? "").trim(),
        href: String(item?.href ?? "").trim(),
      }))
      .filter(
        (item: { label: string; href: string }) => item.label && item.href,
      );

    const updated = await FooterSetting.findOneAndUpdate(
      { key: FOOTER_SETTING_KEY },
      {
        key: FOOTER_SETTING_KEY,
        institutionName,
        address,
        phone,
        email,
        socialLinks,
        updatedBy: req.user?.id || null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate("updatedBy", "name email");

    return res.json({
      success: true,
      message: "Konten Footer & Kontak berhasil disimpan",
      data: {
        isCustom: true,
        institutionName: updated.institutionName,
        address: updated.address,
        phone: updated.phone,
        email: updated.email,
        socialLinks: updated.socialLinks,
        updatedBy: updated.updatedBy || null,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("[UPDATE FOOTER SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan pengaturan footer & kontak",
    });
  }
};

/* ================= RESET FOOTER SETTING (SUPERADMIN) ================= */
export const resetFooterSetting = async (_req: AuthRequest, res: Response) => {
  try {
    await FooterSetting.deleteOne({ key: FOOTER_SETTING_KEY });
    return res.json({
      success: true,
      message: "Konten Footer & Kontak dikembalikan ke default",
      data: {
        isCustom: false,
        ...DEFAULT_FOOTER_CONTENT,
        updatedBy: null,
        updatedAt: null,
      },
    });
  } catch (error) {
    console.error("[RESET FOOTER SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mereset pengaturan footer & kontak",
    });
  }
};
