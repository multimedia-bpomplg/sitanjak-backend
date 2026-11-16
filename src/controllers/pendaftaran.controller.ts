import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import Role from "../models/Role";
import { Multer } from "multer";
import { sendEmail } from "../utils/sendEmail";
import { generateStrongPassword } from "../utils/generatePassword";
import { pesertaEmailTemplate } from "../utils/emailTemplate";
import {
  diterimaMagangEmail,
  ditolakMagangEmail,
} from "../utils/statusMagangEmail";
import Whatsapp from "../models/Whatsapp";
import { sendWhatsapp } from "../utils/sendWhatsapp";
import { sendWhatsappGroup } from "../utils/whatsappClient";
import { createNotification } from "../services/notificationService";

/* ================= TYPE UNTUK MULTER ================= */
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/* =========================
    CREATE PENDAFTARAN
  ========================= */
export const createPendaftaran = async (req: Request, res: Response) => {
  try {
    let { kategori, jumlahPeserta, peserta } = req.body;

    /* ===== VALIDASI DASAR ===== */
    if (!kategori || !jumlahPeserta || !peserta) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Surat pengantar wajib diupload",
      });
    }

    /* ===== SAFE PARSE PESERTA ===== */
    let pesertaRaw: any[];
    try {
      pesertaRaw = typeof peserta === "string" ? JSON.parse(peserta) : peserta;
    } catch {
      return res.status(400).json({
        message: "Format data peserta tidak valid",
      });
    }

    if (!Array.isArray(pesertaRaw) || pesertaRaw.length === 0) {
      return res.status(400).json({
        message: "Peserta wajib diisi",
      });
    }

    /* ===== NORMALISASI + VALIDASI PESERTA ===== */
    const pesertaFix = pesertaRaw.map((p, i) => {
      if (
        !p.nama ||
        !p.posisi ||
        !p.asalJenis ||
        !p.asalNama ||
        (p.asalJenis !== "Instansi" && !p.jurusan) ||
        !p.tanggalMulaiMagang ||
        !p.tanggalSelesaiMagang ||
        !p.tempatLahir ||
        !p.tanggalLahir ||
        !p.jenisKelamin ||
        !p.provinsi ||
        !p.kota ||
        !p.kecamatan ||
        !p.kelurahan ||
        !p.alamatLengkap ||
        !p.email ||
        !p.wa
      ) {
        throw new Error(`Data peserta ke-${i + 1} tidak lengkap`);
      }

      if (p.tanggalSelesaiMagang < p.tanggalMulaiMagang) {
        throw new Error(
          `Tanggal selesai harus setelah tanggal mulai (Peserta ${i + 1})`,
        );
      }

      return {
        nama: p.nama,
        posisi: p.posisi,

        jurusan: p.jurusan, // ✅ PINDAHKAN KE SINI

        asal: {
          jenis: p.asalJenis,
          nama: p.asalNama,
        },

        tanggalMulaiMagang: p.tanggalMulaiMagang,
        tanggalSelesaiMagang: p.tanggalSelesaiMagang,

        tempatLahir: p.tempatLahir,
        tanggalLahir: p.tanggalLahir,
        jenisKelamin: p.jenisKelamin,

        provinsi: p.provinsi,
        kota: p.kota,
        kecamatan: p.kecamatan,
        kelurahan: p.kelurahan,
        alamatLengkap: p.alamatLengkap,

        email: p.email,
        wa: p.wa,

        mentor: undefined,
      };
    });

    /* ===== FIX JUMLAH PESERTA ===== */
    const jumlahFix = Number(jumlahPeserta);
    if (isNaN(jumlahFix) || jumlahFix < 1 || jumlahFix > 5) {
      return res.status(400).json({
        message: "Jumlah peserta harus antara 1 sampai 5",
      });
    }

    if (jumlahFix !== pesertaFix.length) {
      return res.status(400).json({
        message: "Jumlah peserta tidak sesuai dengan data peserta",
      });
    }

    /* ===== SIMPAN KE DATABASE ===== */
    const data = await Pendaftaran.create({
      kategori,
      jumlahPeserta: jumlahFix,
      peserta: pesertaFix,
      suratPengantar: `surat-pengantar/${req.file.filename}`,
    });

    /* ================= NOTIFIKASI IN-APP SYSTEM ================= */
    createNotification({
      recipientRoles: ["admin", "superadmin"],
      title: "Pendaftaran Magang Baru",
      message: `${pesertaFix[0]?.nama || "Pendaftar"} (${pesertaFix[0]?.posisi || "Magang"}) telah mengirim berkas pendaftaran.`,
      type: "info",
      linkUrl: "/dashboard/admin/ViewPendaftaran",
    });

    /* ================= KIRIM NOTIFIKASI WHATSAPP ================= */

    setImmediate(async () => {
      try {
        const whatsapp = await Whatsapp.findOne({ isActive: true });

        if (!whatsapp) {
          console.log("❌ Tidak ada nomor WhatsApp aktif");
          return;
        }

        const pesertaPertama = pesertaFix[0];

        const pesan = `
📢 *PENDAFTARAN MAGANG BARU*

👤 Nama : ${pesertaPertama.nama}
📧 Email : ${pesertaPertama.email}
📱 WA : ${pesertaPertama.wa}

💼 Posisi : ${pesertaPertama.posisi}
👥 Jumlah Peserta : ${jumlahFix}
📂 Kategori : ${kategori}

🕒 ${new Date().toLocaleString("id-ID")}

Dashboard:
https://sitanjak.tech/
`;

        // ================================
        // KIRIM KE GROUP YANG DIPILIH
        // ================================
        if (whatsapp?.groupId) {
          await sendWhatsappGroup(whatsapp.groupId, pesan);

          console.log(
            "✅ Notifikasi terkirim ke grup:",
            whatsapp.groupName || whatsapp.groupId,
          );
        } else {
          console.log("⚠️ Belum ada grup WhatsApp yang dipilih di dashboard");
        }
      } catch (error) {
        console.error("❌ Error kirim WhatsApp:", error);
      }
    });

    /* ===== RESPONSE KE USER ===== */
    return res.status(201).json({
      message: "Pendaftaran berhasil",
      data,
    });
  } catch (err: any) {
    console.error("❌ CREATE PENDAFTARAN ERROR:", err);

    return res.status(500).json({
      message: err.message || "Gagal menyimpan pendaftaran",
    });
  }
};

/* =========================
    HELPER TANGGAL WIB
  ========================= */
const toWibIsoDate = (value?: string | Date | null): string | null => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
};

const computeStatusMagangByDate = (
  mulai?: string,
  selesai?: string,
  todayIso?: string,
): "Belum Waktu Magang" | "Sedang Magang" | "Selesai Magang" | "Menunggu" => {
  const startIso = toWibIsoDate(mulai);
  const endIso = toWibIsoDate(selesai);
  if (!startIso || !endIso) return "Menunggu";

  const nowIso =
    todayIso ||
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  if (nowIso < startIso) return "Belum Waktu Magang";
  if (nowIso > endIso) return "Selesai Magang";
  return "Sedang Magang";
};

/* =========================
    GET ALL PENDAFTARAN
  ========================= */
export const getAllPendaftaran = async (_req: Request, res: Response) => {
  try {
    const data = await Pendaftaran.find()
      .populate("peserta.mentor", "name email posisiMentor")
      .sort({ createdAt: -1 });

    const todayIso = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    const changedDocs: typeof data = [];

    data.forEach((d) => {
      if (d.status !== "Disetujui") return;

      let docChanged = false;
      d.peserta.forEach((p) => {
        if (p.statusMagang === "Tidak Magang") return;

        const newStatus = computeStatusMagangByDate(
          p.tanggalMulaiMagang,
          p.tanggalSelesaiMagang,
          todayIso,
        );

        if (newStatus !== "Menunggu" && newStatus !== p.statusMagang) {
          p.statusMagang = newStatus;
          docChanged = true;
        }
      });

      if (docChanged) {
        changedDocs.push(d);
      }
    });

    if (changedDocs.length > 0) {
      await Promise.all(changedDocs.map((d) => d.save()));
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      message: "Gagal mengambil data pendaftaran",
      error: err.message,
    });
  }
};

/* =========================
    CEK PENDAFTARAN BY EMAIL
  ========================= */
export const cekPendaftaran = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        message: "Email wajib diisi",
      });
    }

    const data = await Pendaftaran.findOne({
      "peserta.email": email,
    }).populate("peserta.mentor", "name email posisiMentor");

    if (!data) {
      return res.status(404).json({
        message: "Data tidak ditemukan",
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error("[CEK PENDAFTARAN ERROR]", err);
    return res.status(500).json({
      message: "Gagal mengecek pendaftaran",
      error: err.message,
    });
  }
};

/* =========================
    UPDATE STATUS + SURAT BALASAN
  ========================= */
export const updateStatus = async (req: MulterRequest, res: Response) => {
  try {
    const { status, jawabanAdmin } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status wajib diisi",
      });
    }

    // Cari data
    const pendaftaran = await Pendaftaran.findById(req.params.id);

    if (!pendaftaran) {
      return res.status(404).json({
        message: "Data pendaftaran tidak ditemukan",
      });
    }

    if (
      pendaftaran.status === "Disetujui" ||
      pendaftaran.status === "Ditolak"
    ) {
      return res.status(400).json({
        message: `Pendaftaran sudah berstatus ${pendaftaran.status} dan tidak dapat diubah lagi`,
      });
    }

    /* ================= UPDATE DATA ================= */

    pendaftaran.status = status;
    pendaftaran.jawabanAdmin = jawabanAdmin;

    if (req.file) {
      pendaftaran.suratBalasan = `surat-balasan/${req.file.filename}`;
    }

    /* ================= UPDATE STATUS MAGANG ================= */

    const todayIso = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    if (status === "Disetujui") {
      pendaftaran.peserta.forEach((p) => {
        const computed = computeStatusMagangByDate(
          p.tanggalMulaiMagang,
          p.tanggalSelesaiMagang,
          todayIso,
        );
        if (computed !== "Menunggu") {
          p.statusMagang = computed;
        }
      });
    }

    if (status === "Ditolak") {
      pendaftaran.peserta.forEach((p) => {
        p.statusMagang = "Tidak Magang";
      });
    }

    /* ================= SIMPAN ================= */

    await pendaftaran.save();

    /* ================= AUTO BUAT AKUN + KIRIM EMAIL ================= */

    let accountsCreated = 0;
    const rolePeserta =
      status === "Disetujui" ? await Role.findOne({ name: "peserta" }) : null;

    await Promise.all(
      pendaftaran.peserta.map(async (peserta) => {
        const normalizedEmail = (peserta.email || "").trim().toLowerCase();

        if (status === "Disetujui") {
          // 1. Kirim email pemberitahuan diterima magang
          try {
            const emailData = diterimaMagangEmail({
              name: peserta.nama,
              email: peserta.email,
              posisi: peserta.posisi,
              tanggalMulai: peserta.tanggalMulaiMagang,
              tanggalSelesai: peserta.tanggalSelesaiMagang,
            });

            await sendEmail({
              to: peserta.email,
              subject: emailData.subject,
              html: emailData.html,
            });
          } catch (mailError) {
            console.error(
              `❌ Gagal kirim email persetujuan ke ${peserta.email}`,
              mailError,
            );
          }

          // 2. Auto-buat akun peserta jika email belum terdaftar
          if (normalizedEmail && rolePeserta) {
            try {
              const escaped = normalizedEmail.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&",
              );
              const existingUser = await User.findOne({
                email: { $regex: new RegExp(`^${escaped}$`, "i") },
              });

              if (!existingUser) {
                const plainPassword = generateStrongPassword(10);
                const hashedPassword = await bcrypt.hash(plainPassword, 10);

                await User.create({
                  name: peserta.nama,
                  email: normalizedEmail,
                  password: hashedPassword,
                  roles: [rolePeserta._id],
                  status: "Aktif",
                  jurusan: peserta.jurusan || "",
                });

                accountsCreated += 1;

                try {
                  await sendEmail({
                    to: normalizedEmail,
                    subject: "Akun Magang Anda Telah Dibuat",
                    html: pesertaEmailTemplate({
                      name: peserta.nama,
                      email: normalizedEmail,
                      password: plainPassword,
                    }),
                  });
                } catch (credMailError) {
                  console.error(
                    `❌ Akun dibuat, tetapi gagal kirim email kredensial ke ${normalizedEmail}`,
                    credMailError,
                  );
                }
              }
            } catch (accountError) {
              console.error(
                `❌ Gagal auto-buat akun untuk ${normalizedEmail}`,
                accountError,
              );
            }
          }
        }

        if (status === "Ditolak") {
          try {
            const emailData = ditolakMagangEmail({
              name: peserta.nama,
              email: peserta.email,
              alasan: jawabanAdmin,
            });

            await sendEmail({
              to: peserta.email,
              subject: emailData.subject,
              html: emailData.html,
            });
          } catch (mailError) {
            console.error(
              `❌ Gagal kirim email penolakan ke ${peserta.email}`,
              mailError,
            );
          }
        }
      }),
    );

    /* ================= RESPONSE ================= */

    return res.json({
      message:
        status === "Disetujui" && accountsCreated > 0
          ? `Status berhasil diperbarui, email terkirim, dan ${accountsCreated} akun peserta otomatis dibuat`
          : "Status berhasil diperbarui & email terkirim",
      accountsCreated,
      data: pendaftaran,
    });
  } catch (err: any) {
    console.error("❌ UPDATE STATUS ERROR:", err);

    return res.status(500).json({
      message: "Gagal memperbarui status",
      error: err.message,
    });
  }
};

/* =========================
   SET MENTOR PENDAFTARAN
========================= */
export const setMentorPendaftaran = async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.body;

    if (!mentorId) {
      return res.status(400).json({
        message: "mentorId wajib dikirim",
      });
    }

    // validasi mentor
    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({
        message: "Mentor tidak ditemukan",
      });
    }

    const updated = await Pendaftaran.findByIdAndUpdate(
      req.params.id,
      { mentor: mentorId },
      { new: true },
    ).populate("mentor", "name email posisiMentor");

    if (!updated) {
      return res.status(404).json({
        message: "Pendaftaran tidak ditemukan",
      });
    }

    return res.json({
      message: "Mentor berhasil ditambahkan",
      data: updated,
    });
  } catch (error: any) {
    console.error("[SET MENTOR ERROR]", error);
    return res.status(500).json({
      message: "Gagal menambahkan mentor",
    });
  }
};

/* =========================
    SET MENTOR 1 PER PESERTA
  ========================= */
export const setMentorPeserta = async (req: Request, res: Response) => {
  try {
    const { email, mentorId } = req.body;

    if (!email || !mentorId) {
      return res.status(400).json({ message: "Email & mentorId wajib" });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ message: "Mentor tidak ditemukan" });
    }

    const pendaftaran = await Pendaftaran.findById(req.params.id);

    if (!pendaftaran) {
      return res.status(404).json({ message: "Pendaftaran tidak ditemukan" });
    }

    if (!pendaftaran.peserta || pendaftaran.peserta.length === 0) {
      return res.status(400).json({
        message: "Data peserta tidak tersedia",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const peserta = pendaftaran.peserta.find(
      (p: any) => p.email?.toLowerCase() === normalizedEmail,
    );

    if (!peserta) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    peserta.mentor = mentorId;

    await pendaftaran.save();

    const populated = await Pendaftaran.findById(req.params.id).populate(
      "peserta.mentor",
      "name email posisiMentor",
    );

    return res.json({
      message: "Mentor peserta berhasil disimpan",
      data: populated,
    });
  } catch (err) {
    return res.status(500).json({ message: "Gagal set mentor peserta" });
  }
};

/* =========================
   DELETE PENDAFTARAN
========================= */
export const deletePendaftaran = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res.status(400).json({
        message: "Tidak ada data yang dipilih",
      });
    }

    await Pendaftaran.deleteMany({
      _id: { $in: ids },
    });

    return res.json({
      message: "Pendaftaran berhasil dihapus",
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Gagal menghapus pendaftaran",
      error: err.message,
    });
  }
};

export const updatePendaftaranData = async (req: Request, res: Response) => {
  try {
    const { peserta } = req.body;

    if (!Array.isArray(peserta) || peserta.length === 0) {
      return res.status(400).json({
        message: "Data peserta tidak valid atau kosong",
      });
    }

    const data = await Pendaftaran.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Pendaftaran tidak ditemukan" });
    }

    const todayIso = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    const normalizedPeserta = peserta.map((p: any, idx: number) => {
      const existing = data.peserta[idx];
      const rawMentor = p?.mentor;
      const mentorId =
        rawMentor && typeof rawMentor === "object"
          ? rawMentor._id
          : rawMentor || existing?.mentor;

      let statusMagang = p?.statusMagang || existing?.statusMagang || "Menunggu";
      if (data.status === "Disetujui") {
        const computed = computeStatusMagangByDate(
          p?.tanggalMulaiMagang ?? undefined,
          p?.tanggalSelesaiMagang ?? undefined,
          todayIso,
        );
        if (computed !== "Menunggu") statusMagang = computed;
      }

      return {
        ...p,
        mentor: mentorId || undefined,
        statusMagang,
      };
    });

    data.peserta = normalizedPeserta as any;

    await data.save();
    await data.populate("peserta.mentor", "name email posisiMentor");

    res.json({
      message: "Data pendaftaran berhasil diperbarui",
      data,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Gagal mengupdate data",
      error: err.message,
    });
  }
};
