// controllers/landingController.ts
import { Request, Response } from "express";
import LandingSection from "../models/LandingSection";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = "public/uploads/landing";

/* ================= GET ALL SECTIONS ================= */
export const getAllSections = async (req: Request, res: Response) => {
  try {
    const sections = await LandingSection.find().sort({ order: 1 });

    const formatted = sections.map((section) => ({
      id: section._id,
      sectionType: section.sectionType,
      title: section.title,
      subtitle: section.subtitle,
      description: section.description,
      images: section.images.map((img) => `/uploads/landing/${img}`),
      content: section.content,
      isActive: section.isActive,
      order: section.order,
      updatedAt: section.updatedAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("[GET SECTIONS ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil data section" });
  }
};

/* ================= GET SECTION BY TYPE ================= */
export const getSectionByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    const section = await LandingSection.findOne({ sectionType: type });

    if (!section) {
      // Return default jika tidak ada
      return res.json(getDefaultSection(type));
    }

    res.json({
      id: section._id,
      sectionType: section.sectionType,
      title: section.title,
      subtitle: section.subtitle,
      description: section.description,
      images: section.images.map((img) => `/uploads/landing/${img}`),
      content: section.content,
      isActive: section.isActive,
      order: section.order,
      updatedAt: section.updatedAt,
    });
  } catch (error) {
    console.error("[GET SECTION BY TYPE ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil section" });
  }
};

/* ================= UPDATE SECTION ================= */
export const updateSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, content, isActive, order } = req.body;

    let section = await LandingSection.findById(id);

    if (!section) {
      // Create new jika tidak ada
      section = await LandingSection.create({
        sectionType: req.body.sectionType,
        title,
        subtitle,
        description,
        content: JSON.parse(content || "{}"),
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
      });
    } else {
      // Handle file uploads
      let imagesToKeep = section.images;

      if (req.files && (req.files as Express.Multer.File[]).length > 0) {
        // Hapus file lama
        section.images.forEach((image) => {
          const imagePath = path.join(UPLOAD_DIR, image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });

        // Simpan file baru
        imagesToKeep = (req.files as Express.Multer.File[]).map(
          (file) => file.filename,
        );
      }

      // Update section
      section = await LandingSection.findByIdAndUpdate(
        id,
        {
          title,
          subtitle,
          description,
          images: imagesToKeep,
          content: content ? JSON.parse(content) : section.content,
          isActive: isActive !== undefined ? isActive : section.isActive,
          order: order !== undefined ? order : section.order,
          updatedAt: new Date(),
        },
        { new: true },
      );
    }

    res.json({
      message: "Section berhasil diperbarui",
      section: {
        id: section?._id,
        sectionType: section?.sectionType,
        title: section?.title,
        subtitle: section?.subtitle,
        description: section?.description,
        images: section?.images.map((img) => `/uploads/landing/${img}`),
        content: section?.content,
        isActive: section?.isActive,
        order: section?.order,
        updatedAt: section?.updatedAt,
      },
    });
  } catch (error) {
    console.error("[UPDATE SECTION ERROR]", error);
    res.status(500).json({ message: "Gagal memperbarui section" });
  }
};

/* ================= DELETE IMAGE FROM SECTION ================= */
export const deleteImageFromSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageName } = req.body;

    const section = await LandingSection.findById(id);

    if (!section) {
      return res.status(404).json({ message: "Section tidak ditemukan" });
    }

    // Hapus file dari sistem
    const imagePath = path.join(UPLOAD_DIR, imageName);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Hapus dari array images
    const updatedImages = section.images.filter((img) => img !== imageName);

    const updatedSection = await LandingSection.findByIdAndUpdate(
      id,
      { images: updatedImages, updatedAt: new Date() },
      { new: true },
    );

    res.json({
      message: "Gambar berhasil dihapus",
      section: {
        images: updatedSection?.images.map((img) => `/uploads/landing/${img}`),
      },
    });
  } catch (error) {
    console.error("[DELETE IMAGE ERROR]", error);
    res.status(500).json({ message: "Gagal menghapus gambar" });
  }
};

/* ================= TOGGLE SECTION ACTIVE ================= */
export const toggleSectionActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const section = await LandingSection.findById(id);

    if (!section) {
      return res.status(404).json({ message: "Section tidak ditemukan" });
    }

    const updatedSection = await LandingSection.findByIdAndUpdate(
      id,
      { isActive: !section.isActive, updatedAt: new Date() },
      { new: true },
    );

    res.json({
      message: `Section ${updatedSection?.isActive ? "diaktifkan" : "dinonaktifkan"}`,
      section: {
        id: updatedSection?._id,
        sectionType: updatedSection?.sectionType,
        isActive: updatedSection?.isActive,
      },
    });
  } catch (error) {
    console.error("[TOGGLE SECTION ERROR]", error);
    res.status(500).json({ message: "Gagal mengubah status section" });
  }
};

/* ================= HELPER: DEFAULT SECTIONS ================= */
const getDefaultSection = (type: string) => {
  const defaults: Record<string, any> = {
    hero: {
      sectionType: "hero",
      title: "Pendaftaran Magang",
      subtitle: "Balai Besar POM Palembang",
      description:
        "Program magang resmi yang dirancang untuk memberikan pengalaman nyata, meningkatkan kompetensi, serta membangun generasi muda siap kerja.",
      images: [],
      content: {},
      isActive: true,
      order: 1,
    },
    statistik: {
      sectionType: "statistik",
      title: "Statistik Program Magang",
      subtitle: "Data Real-time",
      description:
        "Ringkasan data pelaksanaan program magang di Balai Besar POM Palembang sebagai bentuk transparansi dan informasi publik.",
      images: [],
      content: {
        stats: [
          { label: "Total Lowongan Dibuka", value: 12 },
          { label: "Sedang Magang", value: 18 },
          { label: "Selesai Magang", value: 42 },
          { label: "Tidak Diterima / Batal", value: 9 },
          { label: "Total Pendaftar", value: 75 },
        ],
      },
      isActive: true,
      order: 2,
    },
    formasi: {
      sectionType: "formasi",
      title: "Formasi Magang",
      subtitle: "Posisi Tersedia",
      description:
        "Berikut adalah daftar formasi magang yang tersedia di Balai Besar POM Palembang. Pilih formasi sesuai dengan jurusan dan minat Anda.",
      images: [],
      content: {
        positions: [
          {
            title: "Analis Laboratorium",
            divisi: "Laboratorium Pengujian",
            kuota: "3 Orang",
            jurusan: "Kimia, Analis Kimia, Farmasi",
          },
          {
            title: "Administrasi Umum",
            divisi: "Tata Usaha",
            kuota: "2 Orang",
            jurusan: "Administrasi, Manajemen, Akuntansi",
          },
          {
            title: "IT Support",
            divisi: "Sistem Informasi",
            kuota: "2 Orang",
            jurusan: "Informatika, Sistem Informasi",
          },
          {
            title: "Humas & Publikasi",
            divisi: "Informasi & Komunikasi",
            kuota: "2 Orang",
            jurusan: "Ilmu Komunikasi, DKV",
          },
        ],
      },
      isActive: true,
      order: 3,
    },
    manfaat: {
      sectionType: "manfaat",
      title: "Manfaat Program Magang",
      subtitle: "Keuntungan Bergabung",
      description:
        "Program magang ini dirancang untuk memberikan manfaat maksimal bagi mahasiswa dan instansi.",
      images: [],
      content: {
        benefits: [
          {
            title: "Pengalaman Kerja Nyata",
            description:
              "Mahasiswa memperoleh pengalaman langsung di lingkungan kerja profesional sesuai bidangnya.",
          },
          {
            title: "Pengembangan Kompetensi",
            description:
              "Meningkatkan kemampuan teknis dan soft skill yang dibutuhkan di dunia kerja.",
          },
          {
            title: "Sertifikat Magang",
            description:
              "Peserta yang menyelesaikan magang akan mendapatkan sertifikat resmi dari instansi.",
          },
          {
            title: "Pembimbing Profesional",
            description:
              "Didampingi oleh pembimbing berpengalaman selama pelaksanaan magang.",
          },
          {
            title: "Peningkatan Daya Saing",
            description:
              "Menjadi nilai tambah dalam dunia kerja dan meningkatkan daya saing lulusan.",
          },
          {
            title: "Relasi & Jaringan",
            description:
              "Memperluas relasi profesional yang bermanfaat untuk karier di masa depan.",
          },
        ],
      },
      isActive: true,
      order: 4,
    },
    peraturan: {
      sectionType: "peraturan",
      title: "Peraturan Program Magang",
      subtitle: "Ketentuan Wajib",
      description:
        "Berikut adalah ketentuan dan peraturan yang wajib dipatuhi oleh seluruh peserta program magang di Balai Besar POM Palembang.",
      images: [],
      content: {
        rules: [
          {
            title: "Persyaratan Umum",
            description:
              "Peserta merupakan mahasiswa aktif dari perguruan tinggi yang telah bekerja sama dan mendapat rekomendasi resmi dari institusi.",
          },
          {
            title: "Durasi Magang",
            description:
              "Pelaksanaan magang berlangsung minimal 1 bulan dan maksimal 6 bulan sesuai ketentuan instansi.",
          },
          {
            title: "Kehadiran & Disiplin",
            description:
              "Peserta wajib mematuhi jam kerja, tata tertib, serta menjaga etika selama mengikuti program magang.",
          },
          {
            title: "Laporan & Evaluasi",
            description:
              "Peserta diwajibkan menyusun laporan magang dan mengikuti evaluasi di akhir periode.",
          },
          {
            title: "Sanksi & Pembatalan",
            description:
              "Pelanggaran terhadap peraturan dapat mengakibatkan teguran hingga pembatalan keikutsertaan magang.",
          },
        ],
      },
      isActive: true,
      order: 5,
    },
  };

  return defaults[type] || defaults.hero;
};
