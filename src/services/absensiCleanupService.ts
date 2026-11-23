import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Absensi from "../models/Absensi";
import Pendaftaran from "../models/pendaftaran";
import Role from "../models/Role";
import User from "../models/User";

type UploadsSubdir = "absensi" | "surat-pengantar" | "surat-balasan";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeFileInUploadsSubdir(
  subdir: UploadsSubdir,
  storedPath?: string | null,
): boolean {
  if (!storedPath) return false;
  const trimmed = String(storedPath).trim();
  if (
    !trimmed ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return false;
  }

  const targetDir = path.resolve(process.cwd(), "uploads", subdir);
  const safeFileName = path.basename(trimmed.replace(/\\/g, "/"));
  if (!safeFileName) return false;

  const fullPath = path.resolve(targetDir, safeFileName);
  if (!fullPath.startsWith(targetDir + path.sep)) {
    return false;
  }

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (err) {
    console.warn(`[${subdir.toUpperCase()} CLEANUP WARN]`, fullPath, err);
  }
  return false;
}

type AbsensiPhotoRecord = {
  _id: mongoose.Types.ObjectId;
  checkIn?: { photoPath?: string | null } | null;
  checkOut?: { photoPath?: string | null } | null;
};

async function cleanupAbsensiPhotosByRecords(
  records: AbsensiPhotoRecord[],
): Promise<{ recordsCleared: number; filesDeleted: number }> {
  if (records.length === 0) {
    return { recordsCleared: 0, filesDeleted: 0 };
  }

  let filesDeleted = 0;
  const checkInIds: mongoose.Types.ObjectId[] = [];
  const checkOutIds: mongoose.Types.ObjectId[] = [];

  for (const rec of records) {
    const inPath = rec.checkIn?.photoPath?.trim();
    if (inPath) {
      if (removeFileInUploadsSubdir("absensi", inPath)) {
        filesDeleted += 1;
      }
      checkInIds.push(rec._id);
    }

    const outPath = rec.checkOut?.photoPath?.trim();
    if (outPath) {
      if (removeFileInUploadsSubdir("absensi", outPath)) {
        filesDeleted += 1;
      }
      checkOutIds.push(rec._id);
    }
  }

  const updates: Promise<unknown>[] = [];
  if (checkInIds.length > 0) {
    updates.push(
      Absensi.updateMany(
        { _id: { $in: checkInIds }, "checkIn.photoPath": { $exists: true } },
        { $set: { "checkIn.photoPath": "" } },
      ),
    );
  }
  if (checkOutIds.length > 0) {
    updates.push(
      Absensi.updateMany(
        { _id: { $in: checkOutIds }, "checkOut.photoPath": { $exists: true } },
        { $set: { "checkOut.photoPath": "" } },
      ),
    );
  }

  await Promise.all(updates);

  return {
    recordsCleared: new Set([
      ...checkInIds.map((id) => id.toString()),
      ...checkOutIds.map((id) => id.toString()),
    ]).size,
    filesDeleted,
  };
}

/**
 * Menghapus seluruh file foto check-in / check-out absensi milik satu peserta
 * dari disk dan mengosongkan field `photoPath` di database tanpa menghapus
 * riwayat waktu, lokasi, maupun skor absensi.
 */
export async function cleanupAbsensiPhotosForUser(params: {
  userId?: string | mongoose.Types.ObjectId | null;
  email?: string | null;
}): Promise<{ recordsCleared: number; filesDeleted: number }> {
  const identityConditions: Record<string, unknown>[] = [];

  if (params.userId && mongoose.Types.ObjectId.isValid(String(params.userId))) {
    identityConditions.push({
      user: new mongoose.Types.ObjectId(String(params.userId)),
    });
  }

  const cleanEmail = params.email?.trim().toLowerCase();
  if (cleanEmail) {
    identityConditions.push({
      email: new RegExp(`^${escapeRegex(cleanEmail)}$`, "i"),
    });
  }

  if (identityConditions.length === 0) {
    return { recordsCleared: 0, filesDeleted: 0 };
  }

  const records = await Absensi.find({
    $and: [
      { $or: identityConditions },
      {
        $or: [
          { "checkIn.photoPath": { $exists: true, $nin: ["", null] } },
          { "checkOut.photoPath": { $exists: true, $nin: ["", null] } },
        ],
      },
    ],
  })
    .select("_id checkIn.photoPath checkOut.photoPath")
    .lean<AbsensiPhotoRecord[]>();

  return cleanupAbsensiPhotosByRecords(records);
}

type PendaftaranDocLean = {
  _id: mongoose.Types.ObjectId;
  suratPengantar?: string | null;
  suratBalasan?: string | null;
  peserta?: Array<{
    user?: mongoose.Types.ObjectId | null;
    email?: string | null;
  }>;
};

async function cleanupPendaftaranLettersByDocs(
  docs: PendaftaranDocLean[],
): Promise<{ docsCleared: number; filesDeleted: number }> {
  if (docs.length === 0) {
    return { docsCleared: 0, filesDeleted: 0 };
  }

  const userIds: mongoose.Types.ObjectId[] = [];
  const emailSet = new Set<string>();

  for (const doc of docs) {
    for (const ps of doc.peserta || []) {
      if (ps.user && mongoose.Types.ObjectId.isValid(String(ps.user))) {
        userIds.push(new mongoose.Types.ObjectId(String(ps.user)));
      }
      const em = ps.email?.trim().toLowerCase();
      if (em) emailSet.add(em);
    }
  }

  const userQueryOr: Record<string, unknown>[] = [];
  if (userIds.length > 0) userQueryOr.push({ _id: { $in: userIds } });
  if (emailSet.size > 0) {
    userQueryOr.push({
      email: {
        $in: Array.from(emailSet).map(
          (e) => new RegExp(`^${escapeRegex(e)}$`, "i"),
        ),
      },
    });
  }

  const users =
    userQueryOr.length > 0
      ? await User.find({ $or: userQueryOr }).select("_id email status").lean()
      : [];

  const statusById = new Map<string, string>();
  const statusByEmail = new Map<string, string>();
  for (const u of users) {
    statusById.set(u._id.toString(), u.status);
    if (u.email) statusByEmail.set(u.email.trim().toLowerCase(), u.status);
  }

  let filesDeleted = 0;
  let docsCleared = 0;
  const bulkOps: any[] = [];

  for (const doc of docs) {
    const pesertaList = doc.peserta || [];
    if (pesertaList.length === 0) continue;

    let hasNonaktifUser = false;
    let hasAktifUser = false;

    for (const ps of pesertaList) {
      const uid = ps.user ? String(ps.user) : "";
      const em = ps.email?.trim().toLowerCase() || "";
      const status =
        (uid && statusById.get(uid)) || (em && statusByEmail.get(em)) || null;

      if (status === "Nonaktif") {
        hasNonaktifUser = true;
      } else if (status === "Aktif") {
        hasAktifUser = true;
      }
    }

    // Untuk pendaftaran kelompok, hanya hapus surat bersama jika tidak ada peserta yang masih Aktif
    if (!hasNonaktifUser || hasAktifUser) continue;

    const unsetOrClear: Record<string, string> = {};
    const pengantar = doc.suratPengantar?.trim();
    if (pengantar) {
      if (removeFileInUploadsSubdir("surat-pengantar", pengantar)) {
        filesDeleted += 1;
      }
      unsetOrClear.suratPengantar = "";
    }

    const balasan = doc.suratBalasan?.trim();
    if (balasan) {
      if (removeFileInUploadsSubdir("surat-balasan", balasan)) {
        filesDeleted += 1;
      }
      unsetOrClear.suratBalasan = "";
    }

    if (Object.keys(unsetOrClear).length > 0) {
      docsCleared += 1;
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: unsetOrClear },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await Pendaftaran.bulkWrite(bulkOps);
  }

  return { docsCleared, filesDeleted };
}

/**
 * Menghapus file surat pengantar dan surat balasan pada dokumen Pendaftaran
 * terkait peserta apabila seluruh anggota pendaftaran tersebut sudah berstatus Nonaktif.
 */
export async function cleanupPendaftaranFilesForUser(params: {
  userId?: string | mongoose.Types.ObjectId | null;
  email?: string | null;
}): Promise<{ docsCleared: number; filesDeleted: number }> {
  const identityConditions: Record<string, unknown>[] = [];

  if (params.userId && mongoose.Types.ObjectId.isValid(String(params.userId))) {
    identityConditions.push({
      "peserta.user": new mongoose.Types.ObjectId(String(params.userId)),
    });
  }

  const cleanEmail = params.email?.trim().toLowerCase();
  if (cleanEmail) {
    identityConditions.push({
      "peserta.email": new RegExp(`^${escapeRegex(cleanEmail)}$`, "i"),
    });
  }

  if (identityConditions.length === 0) {
    return { docsCleared: 0, filesDeleted: 0 };
  }

  const docs = await Pendaftaran.find({
    $and: [
      { $or: identityConditions },
      {
        $or: [
          { suratPengantar: { $exists: true, $nin: ["", null] } },
          { suratBalasan: { $exists: true, $nin: ["", null] } },
        ],
      },
    ],
  })
    .select("_id suratPengantar suratBalasan peserta.user peserta.email")
    .lean<PendaftaranDocLean[]>();

  return cleanupPendaftaranLettersByDocs(docs);
}

async function findInactivePesertaUsers() {
  const pesertaRole = await Role.findOne({ name: "peserta" })
    .select("_id")
    .lean();

  const userFilter: Record<string, unknown> = { status: "Nonaktif" };
  if (pesertaRole?._id) {
    userFilter.roles = pesertaRole._id;
  }

  return User.find(userFilter).select("_id email").lean();
}

/**
 * Membersihkan seluruh foto absensi milik semua akun peserta yang sudah berstatus Nonaktif
 * (termasuk akun peserta lama yang dinonaktifkan sebelum fitur cleanup ini dibuat).
 */
export async function cleanupAbsensiPhotosForInactivePeserta(): Promise<{
  usersChecked: number;
  recordsCleared: number;
  filesDeleted: number;
}> {
  const inactiveUsers = await findInactivePesertaUsers();

  if (inactiveUsers.length === 0) {
    return { usersChecked: 0, recordsCleared: 0, filesDeleted: 0 };
  }

  const userIds = inactiveUsers.map((u) => u._id);
  const emails = Array.from(
    new Set(
      inactiveUsers
        .map((u) => u.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e)),
    ),
  );

  const identityConditions: Record<string, unknown>[] = [
    { user: { $in: userIds } },
  ];
  if (emails.length > 0) {
    identityConditions.push({ email: { $in: emails } });
  }

  const records = await Absensi.find({
    $and: [
      { $or: identityConditions },
      {
        $or: [
          { "checkIn.photoPath": { $exists: true, $nin: ["", null] } },
          { "checkOut.photoPath": { $exists: true, $nin: ["", null] } },
        ],
      },
    ],
  })
    .select("_id checkIn.photoPath checkOut.photoPath")
    .lean<AbsensiPhotoRecord[]>();

  const result = await cleanupAbsensiPhotosByRecords(records);
  return {
    usersChecked: inactiveUsers.length,
    ...result,
  };
}

/**
 * Membersihkan file surat pengantar dan surat balasan milik akun peserta berstatus Nonaktif
 * (aman untuk pendaftaran kelompok: hanya dihapus jika tidak ada anggota yang masih Aktif).
 */
export async function cleanupPendaftaranFilesForInactivePeserta(): Promise<{
  docsCleared: number;
  filesDeleted: number;
}> {
  const inactiveUsers = await findInactivePesertaUsers();
  if (inactiveUsers.length === 0) {
    return { docsCleared: 0, filesDeleted: 0 };
  }

  const userIds = inactiveUsers.map((u) => u._id);
  const emailRegexes = Array.from(
    new Set(
      inactiveUsers
        .map((u) => u.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e)),
    ),
  ).map((e) => new RegExp(`^${escapeRegex(e)}$`, "i"));

  const identityConditions: Record<string, unknown>[] = [
    { "peserta.user": { $in: userIds } },
  ];
  if (emailRegexes.length > 0) {
    identityConditions.push({ "peserta.email": { $in: emailRegexes } });
  }

  const docs = await Pendaftaran.find({
    $and: [
      { $or: identityConditions },
      {
        $or: [
          { suratPengantar: { $exists: true, $nin: ["", null] } },
          { suratBalasan: { $exists: true, $nin: ["", null] } },
        ],
      },
    ],
  })
    .select("_id suratPengantar suratBalasan peserta.user peserta.email")
    .lean<PendaftaranDocLean[]>();

  return cleanupPendaftaranLettersByDocs(docs);
}
