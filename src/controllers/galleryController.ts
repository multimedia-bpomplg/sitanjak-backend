import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import GalleryItem from "../models/GalleryItem";
import { AuthRequest } from "../middlewares/auth.middleware";

const GALLERY_UPLOAD_DIR = path.join(process.cwd(), "uploads", "gallery");
const SEED_MARKER_FILE = path.join(GALLERY_UPLOAD_DIR, ".default-seeded");

const DEFAULT_GALLERY_LIST = Array.from({ length: 11 }, (_, idx) => {
  const num = idx + 1;
  return {
    num,
    title: `Dokumentasi Kegiatan Magang SI TANJAK ${String(num).padStart(2, "0")}`,
    originalName: `${num}.jpg`,
    defaultPath: `/images/assets-new/galery/${num}.jpg`,
    order: num,
  };
});

function ensureGalleryDir() {
  if (!fs.existsSync(GALLERY_UPLOAD_DIR)) {
    fs.mkdirSync(GALLERY_UPLOAD_DIR, { recursive: true });
  }
}

export function removeGalleryDiskFile(fileName?: string | null) {
  if (!fileName) return;
  const trimmed = String(fileName).trim();
  if (
    !trimmed ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return;
  }
  const safeName = path.basename(trimmed);
  if (!safeName || safeName === ".default-seeded") return;

  const fullPath = path.join(GALLERY_UPLOAD_DIR, safeName);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn("[GALLERY IMAGE CLEANUP WARN]", err);
  }
}

async function seedDefaultGalleryDocuments(forceReset = false) {
  ensureGalleryDir();

  if (forceReset) {
    const existingDocs = await GalleryItem.find().lean();
    for (const doc of existingDocs) {
      if (doc.fileName) {
        removeGalleryDiskFile(doc.fileName);
      }
    }
    await GalleryItem.deleteMany({});
  }

  const frontendPublicGalleryDir = path.resolve(
    process.cwd(),
    "../frontend-bpom/public/images/assets-new/galery",
  );

  const docsToInsert = DEFAULT_GALLERY_LIST.map((item) => {
    const srcFile = path.join(frontendPublicGalleryDir, item.originalName);
    const targetFileName = `default-gallery-${item.num}.jpg`;
    const targetPath = path.join(GALLERY_UPLOAD_DIR, targetFileName);

    let fileName = "";
    let fileSize = 0;

    try {
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, targetPath);
        const stat = fs.statSync(targetPath);
        fileName = targetFileName;
        fileSize = stat.size;
      }
    } catch (err) {
      console.warn("[GALLERY SEED COPY WARN]", err);
    }

    return {
      title: item.title,
      fileName,
      originalName: item.originalName,
      fileSize,
      defaultPath: item.defaultPath,
      order: item.order,
      isActive: true,
      updatedBy: null,
    };
  });

  await GalleryItem.insertMany(docsToInsert);

  try {
    fs.writeFileSync(SEED_MARKER_FILE, new Date().toISOString(), "utf-8");
  } catch {
    // ignore marker error
  }
}

async function ensureInitialSeedIfNeeded() {
  const count = await GalleryItem.countDocuments();
  if (count === 0 && !fs.existsSync(SEED_MARKER_FILE)) {
    await seedDefaultGalleryDocuments(false);
  }
}

function formatGalleryItemResponse(doc: any) {
  const hasUploadedFile = Boolean(doc.fileName);
  const imageUrl = hasUploadedFile
    ? `/uploads/gallery/${doc.fileName}`
    : doc.defaultPath || "";

  return {
    _id: String(doc._id),
    title: doc.title,
    fileName: doc.fileName || null,
    originalName: doc.originalName || doc.fileName || "gallery.webp",
    fileSize: doc.fileSize || 0,
    imageUrl,
    defaultPath: doc.defaultPath || null,
     isCustomFile: hasUploadedFile && !String(doc.fileName).startsWith("default-gallery-"),
    order: typeof doc.order === "number" ? doc.order : 1,
    isActive: doc.isActive !== false,
    updatedBy: doc.updatedBy || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/* ================= GET GALLERY ITEMS (PUBLIC & ADMIN) ================= */
export const getGalleryItems = async (req: Request, res: Response) => {
  try {
    await ensureInitialSeedIfNeeded();

    const activeOnly =
      req.query.activeOnly === "true" || req.query.activeOnly === "1";

    const filter = activeOnly ? { isActive: true } : {};

    const docs = await GalleryItem.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .populate("updatedBy", "name email")
      .lean();

    return res.json({
      success: true,
      data: docs.map(formatGalleryItemResponse),
    });
  } catch (error) {
    console.error("[GET GALLERY ITEMS ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar gambar galeri",
    });
  }
};

/* ================= CREATE GALLERY ITEM (ADMIN & SUPERADMIN) ================= */
export const createGalleryItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File gambar galeri wajib dipilih terlebih dahulu",
      });
    }

    const rawTitle = String(req.body?.title || "").trim();
    const count = await GalleryItem.countDocuments();
    const parsedOrder = Number(req.body?.order);
    const order =
      Number.isFinite(parsedOrder) && parsedOrder > 0
        ? Math.round(parsedOrder)
        : count + 1;

    const title =
      rawTitle ||
      `Dokumentasi Kegiatan Magang SI TANJAK ${String(order).padStart(2, "0")}`;

    const isActive =
      req.body?.isActive === undefined
        ? true
        : req.body.isActive === "true" || req.body.isActive === true;

    const created = await GalleryItem.create({
      title,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      defaultPath: null,
      order,
      isActive,
      updatedBy: req.user?.id || null,
    });

    const populated = await GalleryItem.findById(created._id)
      .populate("updatedBy", "name email")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Gambar galeri baru berhasil ditambahkan",
      data: formatGalleryItemResponse(populated || created),
    });
  } catch (error) {
    if (req.file?.filename) {
      removeGalleryDiskFile(req.file.filename);
    }
    console.error("[CREATE GALLERY ITEM ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan gambar galeri",
    });
  }
};

/* ================= UPDATE / REPLACE GALLERY ITEM (ADMIN & SUPERADMIN) ================= */
export const updateGalleryItem = async (req: AuthRequest, res: Response) => {
  const newFileName = req.file?.filename;
  try {
    const existing = await GalleryItem.findById(req.params.id);
    if (!existing) {
      if (newFileName) removeGalleryDiskFile(newFileName);
      return res.status(404).json({
        success: false,
        message: "Data gambar galeri tidak ditemukan",
      });
    }

    const oldFileName = existing.fileName;

    if (req.body?.title !== undefined) {
      const trimmedTitle = String(req.body.title).trim();
      if (!trimmedTitle) {
        if (newFileName) removeGalleryDiskFile(newFileName);
        return res.status(400).json({
          success: false,
          message: "Judul dokumentasi galeri tidak boleh kosong",
        });
      }
      existing.title = trimmedTitle;
    }

    if (req.body?.order !== undefined) {
      const parsedOrder = Number(req.body.order);
      if (Number.isFinite(parsedOrder) && parsedOrder > 0) {
        existing.order = Math.round(parsedOrder);
      }
    }

    if (req.body?.isActive !== undefined) {
      existing.isActive =
        req.body.isActive === "true" || req.body.isActive === true;
    }

    if (req.file) {
      existing.fileName = req.file.filename;
      existing.originalName = req.file.originalname;
      existing.fileSize = req.file.size;
      existing.defaultPath = null;
    }

    existing.updatedBy = (req.user?.id as any) || existing.updatedBy;
    await existing.save();

    // Hapus file gambar lama dari penyimpanan disk jika diganti dengan file baru
    if (newFileName && oldFileName && oldFileName !== newFileName) {
      removeGalleryDiskFile(oldFileName);
    }

    const populated = await GalleryItem.findById(existing._id)
      .populate("updatedBy", "name email")
      .lean();

    return res.json({
      success: true,
      message: req.file
        ? "Gambar galeri berhasil diganti dan file lama telah dihapus"
        : "Data gambar galeri berhasil diperbarui",
      data: formatGalleryItemResponse(populated || existing),
    });
  } catch (error) {
    if (newFileName) {
      removeGalleryDiskFile(newFileName);
    }
    console.error("[UPDATE GALLERY ITEM ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui gambar galeri",
    });
  }
};

/* ================= TOGGLE ACTIVE STATUS (ADMIN & SUPERADMIN) ================= */
export const toggleGalleryItemStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const existing = await GalleryItem.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Data gambar galeri tidak ditemukan",
      });
    }

    existing.isActive = !existing.isActive;
    existing.updatedBy = (req.user?.id as any) || existing.updatedBy;
    await existing.save();

    const populated = await GalleryItem.findById(existing._id)
      .populate("updatedBy", "name email")
      .lean();

    return res.json({
      success: true,
      message: existing.isActive
        ? "Gambar galeri ditampilkan di Landing Page"
        : "Gambar galeri disembunyikan dari Landing Page",
      data: formatGalleryItemResponse(populated || existing),
    });
  } catch (error) {
    console.error("[TOGGLE GALLERY ITEM ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengubah status tampil gambar galeri",
    });
  }
};

/* ================= DELETE GALLERY ITEM (ADMIN & SUPERADMIN) ================= */
export const deleteGalleryItem = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await GalleryItem.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Data gambar galeri tidak ditemukan",
      });
    }

    const oldFileName = existing.fileName;
    await GalleryItem.deleteOne({ _id: existing._id });

    // Hapus file fisik dari penyimpanan disk agar tidak memenuhi storage
    if (oldFileName) {
      removeGalleryDiskFile(oldFileName);
    }

    return res.json({
      success: true,
      message: "Gambar galeri beserta file penyimpanannya berhasil dihapus",
    });
  } catch (error) {
    console.error("[DELETE GALLERY ITEM ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus gambar galeri",
    });
  }
};

/* ================= RESET GALLERY TO DEFAULT 11 PHOTOS ================= */
export const resetGalleryToDefault = async (
  _req: AuthRequest,
  res: Response,
) => {
  try {
    await seedDefaultGalleryDocuments(true);

    const docs = await GalleryItem.find()
      .sort({ order: 1, createdAt: 1 })
      .populate("updatedBy", "name email")
      .lean();

    return res.json({
      success: true,
      message:
        "Galeri berhasil dikembalikan ke 11 foto bawaan dan file kustom lama telah dibersihkan",
      data: docs.map(formatGalleryItemResponse),
    });
  } catch (error) {
    console.error("[RESET GALLERY DEFAULT ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengembalikan galeri ke pengaturan awal",
    });
  }
};
