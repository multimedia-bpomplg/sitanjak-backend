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

/* ================= SHARED HELPERS: ADMIN & SUPERADMIN ================= */
async function createPrivilegedAccount(
  req: Request,
  res: Response,
  roleName: "admin" | "superadmin",
) {
  const roleLabel = roleName === "superadmin" ? "Superadmin" : "Admin";
  try {
    const rawName = String(req.body?.name || "").trim();
    const rawEmail = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!rawName || !rawEmail || !password) {
      return res.status(400).json({
        message: "Nama, email, dan password wajib diisi",
      });
    }

    const escapedEmail = rawEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exists = await User.findOne({
      email: { $regex: `^${escapedEmail}$`, $options: "i" },
    });
    if (exists) {
      return res.status(409).json({
        message: "Email sudah terdaftar",
      });
    }

    let roleDoc = await Role.findOne({ name: roleName });
    if (!roleDoc) {
      roleDoc = await Role.create({
        name: roleName,
        description: `${roleName} role`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await User.create({
      name: rawName,
      email: rawEmail,
      password: hashedPassword,
      roles: [roleDoc._id],
      status: "Aktif",
      isSuperAccess: false,
    });

    let emailSent = true;
    try {
      await sendEmail({
        to: rawEmail,
        subject: `Akun ${roleLabel} Sistem Magang BPOM`,
        html: adminEmailTemplate({
          name: rawName,
          email: rawEmail,
          password,
          roleLabel,
        }),
      });
    } catch (mailError) {
      emailSent = false;
      console.error(
        `[BUAT ${roleName.toUpperCase()} EMAIL ERROR]`,
        mailError,
      );
    }

    const accountSummary = {
      id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      status: createdUser.status,
      isSuperAccess: createdUser.isSuperAccess,
    };

    const message = emailSent
      ? `Akun ${roleLabel.toLowerCase()} berhasil dibuat & email terkirim`
      : `Akun ${roleLabel.toLowerCase()} berhasil dibuat, namun pengiriman email gagal`;

    return res.status(201).json({
      message,
      emailSent,
      ...(roleName === "superadmin"
        ? { superadmin: accountSummary }
        : { admin: accountSummary }),
    });
  } catch (error) {
    console.error(`[BUAT ${roleName.toUpperCase()} ERROR]`, error);
    return res.status(500).json({
      message: `Gagal membuat akun ${roleLabel.toLowerCase()}`,
    });
  }
}

/* ================= BUAT ADMIN + EMAIL ================= */
export const buatAdmin = async (req: Request, res: Response) => {
  return createPrivilegedAccount(req, res, "admin");
};

/* ================= GET ADMIN ================= */
export const getAdmin = async (_req: Request, res: Response) => {
  try {
    const roleAdmin = await Role.findOne({ name: "admin" });
    if (!roleAdmin) return res.json([]);

    const adminList = await User.find({
      roles: roleAdmin._id,
    })
      .select("name email status isSuperAccess posisiMentor nip wa roles createdAt")
      .populate("roles", "name")
      .lean();

    const formatted = adminList.map((u: any) => ({
      ...u,
      roles: Array.isArray(u.roles)
        ? u.roles.map((r: any) => r?.name).filter(Boolean)
        : ["admin"],
    }));

    res.json(formatted);
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

/* ================= KELOLA SUPERADMIN ================= */
export const buatSuperadmin = async (req: Request, res: Response) => {
  return createPrivilegedAccount(req, res, "superadmin");
};

export const getSuperadmin = async (_req: Request, res: Response) => {
  try {
    const roleSuperadmin = await Role.findOne({ name: "superadmin" });
    if (!roleSuperadmin) return res.json([]);

    const list = await User.find({
      roles: roleSuperadmin._id,
    })
      .select("name email status posisiMentor nip wa roles createdAt")
      .populate("roles", "name")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = list.map((u: any) => ({
      ...u,
      roles: Array.isArray(u.roles)
        ? u.roles.map((r: any) => r?.name).filter(Boolean)
        : ["superadmin"],
    }));

    res.json(formatted);
  } catch {
    res.status(500).json({
      message: "Gagal mengambil data superadmin",
    });
  }
};

const INTERNAL_ROLES = ["superadmin", "admin", "mentor"] as const;
type InternalRole = (typeof INTERNAL_ROLES)[number];

export const updateUserInternalRoles = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const rawRoles = Array.isArray(req.body?.roles) ? req.body.roles : [];

    const selectedRoles = Array.from(
      new Set(
        rawRoles
          .map((r: unknown) => String(r || "").trim().toLowerCase())
          .filter((r: string): r is InternalRole =>
            (INTERNAL_ROLES as readonly string[]).includes(r),
          ),
      ),
    ) as InternalRole[];

    if (selectedRoles.length === 0) {
      return res.status(400).json({
        message: "Minimal pilih satu peran (Superadmin, Admin, atau Mentor)",
      });
    }

    const targetUser: any = await User.findById(id).populate("roles");
    if (!targetUser) {
      return res.status(404).json({ message: "Akun tidak ditemukan" });
    }

    const currentRoleNames: string[] = Array.isArray(targetUser.roles)
      ? targetUser.roles.map((r: any) => r?.name).filter(Boolean)
      : [];

    // Cegah penghapusan peran superadmin dari diri sendiri atau satu-satunya superadmin aktif
    if (
      currentRoleNames.includes("superadmin") &&
      !selectedRoles.includes("superadmin")
    ) {
      if (req.user?.id && String(req.user.id) === String(id)) {
        return res.status(400).json({
          message:
            "Tidak dapat menghapus peran superadmin dari akun yang sedang Anda gunakan",
        });
      }

      const superadminRoleDoc = await Role.findOne({ name: "superadmin" });
      if (superadminRoleDoc) {
        const otherActiveSuperadmins = await User.countDocuments({
          roles: superadminRoleDoc._id,
          status: "Aktif",
          _id: { $ne: id },
        });
        if (otherActiveSuperadmins === 0) {
          return res.status(400).json({
            message:
              "Minimal harus ada satu akun superadmin aktif yang tersisa",
          });
        }
      }
    }

    // Validasi atribut mentor jika peran mentor diaktifkan
    if (selectedRoles.includes("mentor")) {
      const posisiMentor = String(
        req.body?.posisiMentor ?? targetUser.posisiMentor ?? "",
      ).trim();
      const nip = String(req.body?.nip ?? targetUser.nip ?? "").trim();
      const wa = String(req.body?.wa ?? targetUser.wa ?? "").trim();

      if (!posisiMentor || !nip || !wa) {
        return res.status(400).json({
          message:
            "Posisi / Fungsi Pembimbing, NIP Mentor, dan Nomor WhatsApp wajib diisi jika peran Mentor dipilih",
        });
      }

      targetUser.posisiMentor = posisiMentor;
      targetUser.nip = nip;
      targetUser.wa = wa;
    }

    const internalRoleDocs = await Promise.all(
      selectedRoles.map(async (roleName) => {
        let doc = await Role.findOne({ name: roleName });
        if (!doc) {
          doc = await Role.create({
            name: roleName,
            description: `${roleName} role`,
          });
        }
        return doc;
      }),
    );

    const existingNonInternalNames = currentRoleNames.filter(
      (name) => !(INTERNAL_ROLES as readonly string[]).includes(name),
    );
    const existingNonInternalIds = (targetUser.roles as any[])
      .filter((r) => !INTERNAL_ROLES.includes(r?.name))
      .map((r) => r._id);

    targetUser.roles = [
      ...existingNonInternalIds,
      ...internalRoleDocs.map((d) => d._id),
    ];

    await targetUser.save();

    const updatedRoles = Array.from(
      new Set([...existingNonInternalNames, ...selectedRoles]),
    );

    let newToken: string | undefined;
    if (req.user?.id && String(req.user.id) === String(id)) {
      newToken = jwt.sign(
        {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          roles: updatedRoles,
          status: targetUser.status,
          isSuperAccess: Boolean(targetUser.isSuperAccess),
          jurusan: targetUser.jurusan || "",
          kategoriMagang: targetUser.kategoriMagang || "Reguler",
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" },
      );
    }

    return res.json({
      message: "Peran akun berhasil diperbarui",
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        roles: updatedRoles,
        status: targetUser.status,
        posisiMentor: targetUser.posisiMentor || "",
        nip: targetUser.nip || "",
        wa: targetUser.wa || "",
      },
      ...(newToken ? { newToken } : {}),
    });
  } catch (error) {
    console.error("[UPDATE USER INTERNAL ROLES ERROR]", error);
    return res.status(500).json({
      message: "Gagal memperbarui peran akun",
    });
  }
};

export const nonaktifkanSuperadmin = async (req: any, res: Response) => {
  try {
    const targetId = req.params.id;
    if (req.user?.id && String(req.user.id) === String(targetId)) {
      return res.status(400).json({
        message: "Tidak dapat menonaktifkan akun superadmin yang sedang digunakan",
      });
    }

    const roleSuperadmin = await Role.findOne({ name: "superadmin" });
    if (roleSuperadmin) {
      const otherActiveCount = await User.countDocuments({
        roles: roleSuperadmin._id,
        status: "Aktif",
        _id: { $ne: targetId },
      });
      if (otherActiveCount === 0) {
        return res.status(400).json({
          message: "Minimal harus ada satu akun superadmin yang tetap aktif",
        });
      }
    }

    const updated = await User.findByIdAndUpdate(
      targetId,
      { status: "Nonaktif" },
      { new: true },
    ).select("_id name email status");

    if (!updated) {
      return res.status(404).json({ message: "Akun superadmin tidak ditemukan" });
    }

    res.json({ message: "Akun superadmin berhasil dinonaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal menonaktifkan akun superadmin" });
  }
};

export const aktifkanSuperadmin = async (req: Request, res: Response) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { status: "Aktif" },
      { new: true },
    ).select("_id name email status");

    if (!updated) {
      return res.status(404).json({ message: "Akun superadmin tidak ditemukan" });
    }

    res.json({ message: "Akun superadmin berhasil diaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal mengaktifkan akun superadmin" });
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

    const pendaftaranTerbaru = pendaftaranList.map((doc: any) => ({
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
