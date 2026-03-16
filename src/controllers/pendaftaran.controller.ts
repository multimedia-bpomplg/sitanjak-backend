import { Request, Response } from "express";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { Multer } from "multer";
import { sendEmail } from "../utils/sendEmail";
import {
  diterimaMagangEmail,
  ditolakMagangEmail,
} from "../utils/statusMagangEmail";
import Whatsapp from "../models/Whatsapp";
import { sendWhatsapp } from "../utils/sendWhatsapp";
import { sendWhatsappGroup } from "../utils/whatsappClient";

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
    GET ALL PENDAFTARAN
  ========================= */
export const getAllPendaftaran = async (_req: Request, res: Response) => {
  try {
    const data = await Pendaftaran.find()
      .populate("peserta.mentor", "name email posisiMentor")
      .sort({ createdAt: -1 });

    const today = new Date();

    let changed = false;

    data.forEach((d) => {
      if (d.status !== "Disetujui") return;

      d.peserta.forEach((p) => {
        const start = new Date(p.tanggalMulaiMagang);
        const end = new Date(p.tanggalSelesaiMagang);

        let newStatus = p.statusMagang;

        // ✅ BELUM MULAI
        if (today < start) {
          newStatus = "Belum Waktu Magang";
        }

        // ✅ SEDANG
        else if (today >= start && today <= end) {
          newStatus = "Sedang Magang";
        }

        // ✅ SELESAI
        else {
          newStatus = "Selesai Magang";
        }

        if (newStatus !== p.statusMagang) {
          p.statusMagang = newStatus;
          changed = true;
        }
      });
    });

    // Simpan kalau ada perubahan
    if (changed) {
      await Promise.all(data.map((d) => d.save()));
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

    /* ================= UPDATE DATA ================= */

    pendaftaran.status = status;
    pendaftaran.jawabanAdmin = jawabanAdmin;

    if (req.file) {
      pendaftaran.suratBalasan = `surat-balasan/${req.file.filename}`;
    }

    /* ================= UPDATE STATUS MAGANG ================= */

    const today = new Date();

    if (status === "Disetujui") {
      pendaftaran.peserta.forEach((p) => {
        const start = new Date(p.tanggalMulaiMagang);
        const end = new Date(p.tanggalSelesaiMagang);

        if (today < start) {
          p.statusMagang = "Belum Waktu Magang";
        } else if (today >= start && today <= end) {
          p.statusMagang = "Sedang Magang";
        } else {
          p.statusMagang = "Selesai Magang";
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

    /* ================= KIRIM EMAIL ================= */

    Promise.all(
      pendaftaran.peserta.map(async (peserta) => {
        try {
          if (status === "Disetujui") {
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
          }

          if (status === "Ditolak") {
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
          }
        } catch (mailError) {
          console.error(`❌ Gagal kirim email ke ${peserta.email}`, mailError);
        }
      }),
    );

    /* ================= RESPONSE ================= */

    return res.json({
      message: "Status berhasil diperbarui & email terkirim",
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

    const pendaftaran = await Pendaftaran.findOne({
      _id: req.params.id,
      "peserta.email": email,
    });

    if (!pendaftaran) {
      return res.status(404).json({ message: "Peserta tidak ditemukan" });
    }

    // ✅ Pastikan peserta ada
    if (!pendaftaran.peserta || pendaftaran.peserta.length === 0) {
      return res.status(400).json({
        message: "Data peserta tidak tersedia",
      });
    }

    const peserta = pendaftaran.peserta.find((p: any) => p.email === email);

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

    const data = await Pendaftaran.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Pendaftaran tidak ditemukan" });
    }

    data.peserta = peserta;

    await data.save();

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
