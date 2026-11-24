import { Request, Response } from "express";
import ProfilSetting from "../models/ProfilSetting";
import { AuthRequest } from "../middlewares/auth.middleware";

const PROFIL_SETTING_KEY = "landing-profil";

export const DEFAULT_PROFIL_CONTENT = {
  overlineTag: "BALAI BESAR POM DI PALEMBANG",
  headingLine1: "Balai Besar Pengawas Obat",
  headingHighlight: "dan Makanan di Palembang",
  profilDescription:
    "Balai Besar Pengawas Obat dan Makanan (BBPOM) di Palembang merupakan Unit Pelaksana Teknis Badan POM yang bertugas melaksanakan pengawasan Obat dan Makanan untuk menjamin keamanan, mutu, dan manfaat produk, sekaligus menyediakan wadah pembelajaran profesional melalui program magang SI TANJAK.",
  profilHighlights: [
    {
      title: "Pengawasan Terpadu",
      desc: "Mengawal keamanan, mutu, dan khasiat Obat serta Makanan di masyarakat.",
      iconKey: "shield",
    },
    {
      title: "Laboratorium Modern",
      desc: "Fasilitas pengujian kimia, mikrobiologi, dan molekuler berstandar tinggi.",
      iconKey: "beaker",
    },
    {
      title: "Edukasi & Pembinaan",
      desc: "Wadah pembelajaran nyata bagi mahasiswa dan siswa magang akademik.",
      iconKey: "academic",
    },
    {
      title: "SDM Profesional",
      desc: "Didukung pengawas farmasi dan pangan ahli yang siap membimbing.",
      iconKey: "users",
    },
  ],
  visi: "Terwujudnya Sediaan Farmasi dan Pangan Olahan yang aman, bermutu, dan berdaya saing dalam mendukung masyarakat sehat dan sejahtera bersama Indonesia Maju menuju Indonesia Emas 2045.",
  misiList: [
    "Meningkatkan efektivitas pengawasan Sediaan Farmasi dan Pangan Olahan serta penindakan kejahatan melalui kolaborasi pemerintah, pelaku usaha, dan masyarakat.",
    "Memfasilitasi percepatan pengembangan dunia usaha Sediaan Farmasi dan Pangan Olahan termasuk UMKM guna membangun struktur ekonomi yang produktif dan berdaya saing.",
    "Meningkatkan kapasitas masyarakat di bidang Sediaan Farmasi dan Pangan Olahan dengan mengembangkan kemitraan bersama seluruh pemangku kepentingan.",
    "Pengelolaan pemerintahan yang bersih, efektif, dan terpercaya untuk memberikan pelayanan publik yang prima.",
  ],
  dasarHukumRegulasi: "Peraturan Badan POM Nomor 19 Tahun 2023",
  dasarHukumTentang:
    "tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis di Lingkungan Badan POM:",
  tugasPokok:
    "Melaksanakan tugas teknis operasional di bidang pengawasan Obat dan Makanan pada wilayah kerja masing-masing sesuai dengan ketentuan peraturan perundang-undangan.",
  fungsiUtamaList: [
    "Penyusunan rencana, program, dan anggaran di bidang pengawasan Obat dan Makanan;",
    "Pelaksanaan pemeriksaan fasilitas produksi Obat dan Makanan;",
    "Pelaksanaan pemeriksaan fasilitas distribusi Obat dan Makanan dan fasilitas pelayanan kefarmasian;",
    "Pelaksanaan sertifikasi produk dan fasilitas produksi dan distribusi Obat dan Makanan;",
    "Pelaksanaan sampling Obat dan Makanan;",
    "Pelaksanaan pemantauan label dan iklan Obat dan Makanan;",
    "Pelaksanaan pengujian rutin Obat dan Makanan;",
    "Pelaksanaan pengujian Obat dan Makanan dalam rangka investigasi dan penyidikan;",
    "Pelaksanaan cegah tangkal, intelijen, dan penyidikan terhadap pelanggaran ketentuan peraturan perundang-undangan;",
    "Pelaksanaan pemantauan peredaran Obat dan Makanan melalui siber;",
    "Pengelolaan komunikasi, informasi, edukasi, dan pengaduan masyarakat;",
    "Pelaksanaan kerja sama di bidang pengawasan Obat dan Makanan;",
    "Pelaksanaan pemantauan, evaluasi, dan pelaporan di bidang pengawasan Obat dan Makanan;",
    "Pelaksanaan urusan tata usaha dan rumah tangga; dan",
    "Pelaksanaan fungsi lain yang diberikan oleh Kepala Badan.",
  ],
};

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item ?? "").trim()).filter(Boolean);
}

/* ================= GET PROFIL SETTING (PUBLIC) ================= */
export const getProfilSetting = async (_req: Request, res: Response) => {
  try {
    const doc = (await ProfilSetting.findOne({ key: PROFIL_SETTING_KEY })
      .populate("updatedBy", "name email")
      .lean()) as Record<string, any> | null;

    if (!doc) {
      return res.json({
        success: true,
        data: {
          isCustom: false,
          ...DEFAULT_PROFIL_CONTENT,
          updatedBy: null,
          updatedAt: null,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        isCustom: true,
        overlineTag: doc.overlineTag || DEFAULT_PROFIL_CONTENT.overlineTag,
        headingLine1: doc.headingLine1 || DEFAULT_PROFIL_CONTENT.headingLine1,
        headingHighlight:
          doc.headingHighlight || DEFAULT_PROFIL_CONTENT.headingHighlight,
        profilDescription:
          doc.profilDescription || DEFAULT_PROFIL_CONTENT.profilDescription,
        profilHighlights: Array.isArray(doc.profilHighlights)
          ? doc.profilHighlights
          : DEFAULT_PROFIL_CONTENT.profilHighlights,
        visi: doc.visi || DEFAULT_PROFIL_CONTENT.visi,
        misiList: Array.isArray(doc.misiList)
          ? doc.misiList
          : DEFAULT_PROFIL_CONTENT.misiList,
        dasarHukumRegulasi:
          doc.dasarHukumRegulasi || DEFAULT_PROFIL_CONTENT.dasarHukumRegulasi,
        dasarHukumTentang:
          doc.dasarHukumTentang || DEFAULT_PROFIL_CONTENT.dasarHukumTentang,
        tugasPokok: doc.tugasPokok || DEFAULT_PROFIL_CONTENT.tugasPokok,
        fungsiUtamaList: Array.isArray(doc.fungsiUtamaList)
          ? doc.fungsiUtamaList
          : DEFAULT_PROFIL_CONTENT.fungsiUtamaList,
        updatedBy: doc.updatedBy || null,
        updatedAt: doc.updatedAt || null,
      },
    });
  } catch (error) {
    console.error("[GET PROFIL SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pengaturan profil landing page",
    });
  }
};

/* ================= UPDATE PROFIL SETTING (SUPERADMIN) ================= */
export const updateProfilSetting = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};

    const overlineTag = String(
      body.overlineTag ?? DEFAULT_PROFIL_CONTENT.overlineTag,
    ).trim();
    const headingLine1 = String(
      body.headingLine1 ?? DEFAULT_PROFIL_CONTENT.headingLine1,
    ).trim();
    const headingHighlight = String(
      body.headingHighlight ?? DEFAULT_PROFIL_CONTENT.headingHighlight,
    ).trim();
    const profilDescription = String(body.profilDescription ?? "").trim();
    const visi = String(body.visi ?? "").trim();
    const dasarHukumRegulasi = String(body.dasarHukumRegulasi ?? "").trim();
    const dasarHukumTentang = String(body.dasarHukumTentang ?? "").trim();
    const tugasPokok = String(body.tugasPokok ?? "").trim();

    if (!overlineTag || !headingLine1 || !headingHighlight || !profilDescription) {
      return res.status(400).json({
        success: false,
        message: "Judul dan deskripsi bagian Profil wajib diisi",
      });
    }

    if (!visi) {
      return res.status(400).json({
        success: false,
        message: "Isi Visi wajib diisi",
      });
    }

    if (!dasarHukumRegulasi || !dasarHukumTentang || !tugasPokok) {
      return res.status(400).json({
        success: false,
        message: "Dasar hukum dan Tugas Pokok wajib diisi",
      });
    }

    const misiList = normalizeStringList(body.misiList);
    if (misiList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal harus ada 1 poin Misi",
      });
    }

    const fungsiUtamaList = normalizeStringList(body.fungsiUtamaList);
    if (fungsiUtamaList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal harus ada 1 poin Fungsi Utama",
      });
    }

    const rawHighlights = Array.isArray(body.profilHighlights)
      ? body.profilHighlights
      : [];
    const profilHighlights = rawHighlights
      .map((item: any) => ({
        title: String(item?.title ?? "").trim(),
        desc: String(item?.desc ?? "").trim(),
        iconKey: String(item?.iconKey ?? "shield").trim() || "shield",
      }))
      .filter((item: { title: string; desc: string }) => item.title && item.desc);

    if (profilHighlights.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal harus ada 1 poin keunggulan Profil (judul & deskripsi)",
      });
    }

    const updated = await ProfilSetting.findOneAndUpdate(
      { key: PROFIL_SETTING_KEY },
      {
        key: PROFIL_SETTING_KEY,
        overlineTag,
        headingLine1,
        headingHighlight,
        profilDescription,
        profilHighlights,
        visi,
        misiList,
        dasarHukumRegulasi,
        dasarHukumTentang,
        tugasPokok,
        fungsiUtamaList,
        updatedBy: req.user?.id || null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate("updatedBy", "name email");

    return res.json({
      success: true,
      message: "Konten Profil Landing Page berhasil disimpan",
      data: {
        isCustom: true,
        overlineTag: updated.overlineTag,
        headingLine1: updated.headingLine1,
        headingHighlight: updated.headingHighlight,
        profilDescription: updated.profilDescription,
        profilHighlights: updated.profilHighlights,
        visi: updated.visi,
        misiList: updated.misiList,
        dasarHukumRegulasi: updated.dasarHukumRegulasi,
        dasarHukumTentang: updated.dasarHukumTentang,
        tugasPokok: updated.tugasPokok,
        fungsiUtamaList: updated.fungsiUtamaList,
        updatedBy: updated.updatedBy || null,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("[UPDATE PROFIL SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan pengaturan profil landing page",
    });
  }
};

/* ================= RESET PROFIL SETTING TO DEFAULT (SUPERADMIN) ================= */
export const resetProfilSetting = async (_req: AuthRequest, res: Response) => {
  try {
    await ProfilSetting.deleteOne({ key: PROFIL_SETTING_KEY });
    return res.json({
      success: true,
      message: "Konten Profil Landing Page dikembalikan ke pengaturan default",
      data: {
        isCustom: false,
        ...DEFAULT_PROFIL_CONTENT,
        updatedBy: null,
        updatedAt: null,
      },
    });
  } catch (error) {
    console.error("[RESET PROFIL SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mereset pengaturan profil landing page",
    });
  }
};
