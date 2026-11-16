// controllers/AdminController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Role from "../models/Role";
import Pendaftaran from "../models/pendaftaran";
import Logbook from "../models/Logbook";
import LaporanAkhir from "../models/LaporanAkhir";
import Feedback from "../models/Feedback";
import { sendEmail } from "../utils/sendEmail";
import { adminEmailTemplate } from "../utils/adminEmailTemplate";

/* ================= BUAT ADMIN + EMAIL ================= */
export const buatAdmin = async (req: Request, res: Response) => {
  try {
    const rawName = String(req.body?.name || "").trim();
    const rawEmail = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    /* VALIDASI */
    if (!rawName || !rawEmail || !password) {
      return res.status(400).json({
        message: "Nama, email, dan password wajib diisi",
      });
    }

    /* CEK EMAIL (CASE-INSENSITIVE) */
    const escapedEmail = rawEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exists = await User.findOne({
      email: { $regex: `^${escapedEmail}$`, $options: "i" },
    });
    if (exists) {
      return res.status(409).json({
        message: "Email sudah terdaftar",
      });
    }

    /* ROLE ADMIN */
    const roleAdmin = await Role.findOne({ name: "admin" });
    if (!roleAdmin) {
      return res.status(500).json({
        message: "Role admin tidak ditemukan",
      });
    }

    /* HASH PASSWORD */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* CREATE USER */
    const admin = await User.create({
      name: rawName,
      email: rawEmail,
      password: hashedPassword,
      roles: [roleAdmin._id],
      status: "Aktif",
      isSuperAccess: false, // Default false
    });

    /* KIRIM EMAIL */
    await sendEmail({
      to: rawEmail,
      subject: "Akun Admin Sistem Magang BPOM",
      html: adminEmailTemplate({
        name: rawName,
        email: rawEmail,
        password, // ⚠️ hanya dikirim via email
      }),
    });

    res.status(201).json({
      message: "Akun admin berhasil dibuat & email terkirim",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
        isSuperAccess: admin.isSuperAccess,
      },
    });
  } catch (error) {
    console.error("[BUAT ADMIN ERROR]", error);
    res.status(500).json({
      message: "Gagal membuat akun admin",
    });
  }
};

/* ================= GET ADMIN ================= */
export const getAdmin = async (_req: Request, res: Response) => {
  try {
    const roleAdmin = await Role.findOne({ name: "admin" });
    if (!roleAdmin) return res.json([]);

    const admin = await User.find({
      roles: roleAdmin._id,
    }).select("name email status isSuperAccess createdAt");

    res.json(admin);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data admin",
    });
  }
};

/* ================= NONAKTIFKAN ================= */
export const nonaktifkanAdmin = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Nonaktif",
    });

    res.json({ message: "Akun admin berhasil dinonaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal menonaktifkan akun admin" });
  }
};

/* ================= AKTIFKAN ================= */
export const aktifkanAdmin = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Aktif",
    });

    res.json({ message: "Akun admin berhasil diaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal mengaktifkan akun admin" });
  }
};

/* ================= SET SUPER ACCESS ================= */
export const setSuperAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isSuperAccess } = req.body;

    const admin = await User.findByIdAndUpdate(
      id,
      { isSuperAccess },
      { new: true },
    ).select("name email status isSuperAccess");

    if (!admin) {
      return res.status(404).json({
        message: "Admin tidak ditemukan",
      });
    }

    // GENERATE TOKEN BARU JIKA PERLU
    if (isSuperAccess) {
      const token = jwt.sign(
        {
          id: admin._id,
          email: admin.email,
          roles: ["admin"],
          isSuperAccess: true,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" },
      );

      res.json({
        message: `Super access ${isSuperAccess ? "diaktifkan" : "dinonaktifkan"}`,
        admin,
        newToken: token,
      });
    } else {
      res.json({
        message: `Super access ${isSuperAccess ? "diaktifkan" : "dinonaktifkan"}`,
        admin,
      });
    }
  } catch (error) {
    console.error("[SET SUPER ACCESS ERROR]", error);
    res.status(500).json({
      message: "Gagal mengatur super access",
    });
  }
};

/* ================= DASHBOARD SUMMARY ADMIN ================= */
const toWibIsoDate = (value?: string | Date | null): string | null => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
};

export const getAdminDashboardSummary = async (req: any, res: Response) => {
  try {
    const adminId = req.user.id;
    const [adminUser, rolePeserta, roleMentor] = await Promise.all([
      User.findById(adminId).select("name email"),
      Role.findOne({ name: "peserta" }),
      Role.findOne({ name: "mentor" }),
    ]);

    const [
      pendaftaranList,
      pesertaUsers,
      mentorUsers,
      totalLogbook,
      logbookMenunggu,
      totalLaporanAkhir,
      laporanAkhirMenunggu,
      totalFeedback,
      feedbackBelumDirespon,
    ] = await Promise.all([
      Pendaftaran.find()
        .populate("peserta.mentor", "name email posisiMentor")
        .sort({ createdAt: -1 })
        .lean(),
      rolePeserta
        ? User.find({ roles: rolePeserta._id }).select("status").lean()
        : Promise.resolve([]),
      roleMentor
        ? User.find({ roles: roleMentor._id }).select("status").lean()
        : Promise.resolve([]),
      Logbook.countDocuments(),
      Logbook.countDocuments({ approvalStatus: "menunggu" }),
      LaporanAkhir.countDocuments(),
      LaporanAkhir.countDocuments({ status: "Menunggu" }),
      Feedback.countDocuments(),
      Feedback.countDocuments({
        $or: [{ mentorResponse: { $exists: false } }, { mentorResponse: "" }],
      }),
    ]);

    const todayIso = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    let pendaftaranMenunggu = 0;
    let pendaftaranSedangDiproses = 0;
    let pendaftaranDisetujui = 0;
    let pendaftaranDitolak = 0;
    let pendaftaranHariIni = 0;

    let totalPesertaDisetujui = 0;
    let pesertaSedangMagang = 0;
    let pesertaBelumMulai = 0;
    let pesertaSelesai = 0;
    let pesertaTanpaMentor = 0;

    pendaftaranList.forEach((doc: any) => {
      if (doc.status === "Menunggu") pendaftaranMenunggu += 1;
      else if (doc.status === "Sedang Diproses") pendaftaranSedangDiproses += 1;
      else if (doc.status === "Disetujui") pendaftaranDisetujui += 1;
      else if (doc.status === "Ditolak") pendaftaranDitolak += 1;

      const createdIso = toWibIsoDate(doc.createdAt);
      if (createdIso === todayIso) {
        pendaftaranHariIni += 1;
      }

      if (doc.status === "Disetujui" && Array.isArray(doc.peserta)) {
        doc.peserta.forEach((ps: any) => {
          totalPesertaDisetujui += 1;
          if (!ps.mentor) {
            pesertaTanpaMentor += 1;
          }

          if (ps.statusMagang === "Selesai Magang") {
            pesertaSelesai += 1;
            return;
          }
          if (ps.statusMagang === "Tidak Magang") {
            return;
          }

          const startIso = toWibIsoDate(ps.tanggalMulaiMagang);
          const endIso = toWibIsoDate(ps.tanggalSelesaiMagang);

          if (startIso && todayIso < startIso) {
            pesertaBelumMulai += 1;
          } else if (endIso && todayIso > endIso) {
            pesertaSelesai += 1;
          } else {
            pesertaSedangMagang += 1;
          }
        });
      }
    });

    const pendaftaranTerbaru = pendaftaranList.slice(0, 6).map((doc: any) => ({
      _id: doc._id,
      kategori: doc.kategori,
      status: doc.status,
      createdAt: doc.createdAt,
      jumlahPeserta: Array.isArray(doc.peserta) ? doc.peserta.length : 0,
      peserta: (doc.peserta || []).map((ps: any) => ({
        nama: ps.nama,
        email: ps.email,
        wa: ps.wa,
        posisi: ps.posisi,
        jurusan: ps.jurusan,
        asal: ps.asal || null,
        tanggalMulaiMagang: ps.tanggalMulaiMagang,
        tanggalSelesaiMagang: ps.tanggalSelesaiMagang,
        mentor: ps.mentor || null,
      })),
    }));

    res.json({
      admin: adminUser
        ? {
            name: adminUser.name,
            email: adminUser.email,
          }
        : null,
      summary: {
        totalPendaftaran: pendaftaranList.length,
        pendaftaranMenunggu,
        pendaftaranSedangDiproses,
        pendaftaranDisetujui,
        pendaftaranDitolak,
        pendaftaranHariIni,
        totalPesertaDisetujui,
        pesertaSedangMagang,
        pesertaBelumMulai,
        pesertaSelesai,
        pesertaTanpaMentor,
        totalAkunPeserta: pesertaUsers.length,
        akunPesertaAktif: pesertaUsers.filter((u: any) => u.status === "Aktif")
          .length,
        totalMentor: mentorUsers.length,
        mentorAktif: mentorUsers.filter((u: any) => u.status === "Aktif").length,
        totalLogbook,
        logbookMenunggu,
        totalLaporanAkhir,
        laporanAkhirMenunggu,
        totalFeedback,
        feedbackBelumDirespon,
      },
      pendaftaranTerbaru,
    });
  } catch (error) {
    console.error("[GET ADMIN DASHBOARD SUMMARY]", error);
    res.status(500).json({
      message: "Gagal memuat ringkasan dashboard admin",
    });
  }
};
