// controllers/laporanBulananController.ts
import { Response } from "express";
import LaporanBulanan from "../models/LaporanBulanan";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User"; // TAMBAHKAN INI

/* ================= CREATE ================= */
export const createLaporanBulanan = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const exists = await LaporanBulanan.findOne({
      user: userId,
      month: req.body.month,
    });

    if (exists) {
      return res.status(400).json({
        message: "Laporan bulanan untuk periode ini sudah diisi",
      });
    }

    const laporan = await LaporanBulanan.create({
      user: userId,
      ...req.body,
    });

    res.status(201).json(laporan);
  } catch (err) {
    res.status(500).json({ message: "Gagal menyimpan laporan bulanan" });
  }
};

/* ================= GET BY MONTH ================= */
export const getLaporanByMonth = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { month } = req.params;

    const laporan = await LaporanBulanan.findOne({
      user: userId,
      month,
    });

    if (!laporan) {
      return res.status(404).json({
        message: "Laporan bulanan tidak ditemukan",
      });
    }

    res.json(laporan);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil laporan bulanan",
    });
  }
};

/* ================= RIWAYAT (PESERTA) ================= */
export const getRiwayatLaporanBulanan = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const laporan = await LaporanBulanan.find({ user: userId })
      .sort({ month: -1 })
      .select("month status mentorNote approvedByMentor createdAt");

    // Format data untuk frontend
    const formatted = laporan.map((item: any) => ({
      month: item.month,
      status: item.status || "Menunggu",
      mentorNote: item.mentorNote || "",
      createdAt: item.createdAt,
      approvedByMentor: item.approvedByMentor,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil riwayat laporan bulanan",
    });
  }
};

/* ================= APPROVE LAPORAN BULANAN (OLD VERSION - REPLACE) ================= */
export const approveLaporanBulananOld = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { mentorNote } = req.body;

    const laporan = await LaporanBulanan.findById(id).populate("user");
    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    const valid = await Pendaftaran.findOne({
      "peserta.email": (laporan.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    laporan.approvedByMentor = mentorId;
    laporan.mentorNote = mentorNote;
    laporan.approvedAt = new Date();
    await laporan.save();

    res.json({ message: "Disetujui", data: laporan });
  } catch {
    res.status(500).json({ message: "Gagal approve laporan bulanan" });
  }
};

/* ================= GET LAPORAN PESERTA (UNTUK MENTOR) - REVISED ================= */
export const getLaporanPesertaForMentor = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { pesertaId, month } = req.params;

    console.log("Mencari laporan untuk:", { mentorId, pesertaId, month });

    // Cari pendaftaran berdasarkan peserta ID
    const pendaftaran = await Pendaftaran.findOne({
      "peserta._id": pesertaId,
      "peserta.mentor": mentorId,
      status: "Disetujui",
    });

    if (!pendaftaran) {
      console.log("Tidak ditemukan pendaftaran yang sesuai");
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke laporan peserta ini",
      });
    }

    // Temukan peserta dalam array peserta
    const peserta = pendaftaran.peserta.find(
      (p: any) => p._id.toString() === pesertaId,
    );

    if (!peserta) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan dalam pendaftaran",
      });
    }

    // Cari user berdasarkan email peserta
    const user = await User.findOne({ email: peserta.email });

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan untuk peserta ini",
      });
    }

    // Cari laporan bulanan
    const laporan = await LaporanBulanan.findOne({
      user: user._id,
      month,
    }).populate("user", "name email");

    if (!laporan) {
      return res.status(404).json({
        message: "Laporan bulanan tidak ditemukan",
      });
    }

    res.json(laporan);
  } catch (err) {
    console.error("Error getLaporanPesertaForMentor:", err);
    res.status(500).json({
      message: "Gagal mengambil laporan bulanan peserta",
    });
  }
};

/* ================= UPDATE STATUS LAPORAN (NEW VERSION) ================= */
export const updateStatusLaporanBulanan = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { status, mentorNote } = req.body;

    // Validasi status
    const validStatus = ["Menunggu", "Disetujui", "Ditolak", "Perbaiki"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Status tidak valid",
      });
    }

    const laporan = await LaporanBulanan.findById(id)
      .populate("user", "email")
      .lean();

    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    // Verifikasi bahwa mentor adalah mentor dari peserta ini
    const valid = await Pendaftaran.findOne({
      "peserta.email": (laporan.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    // Update laporan
    const updated = await LaporanBulanan.findByIdAndUpdate(
      id,
      {
        status,
        mentorNote: mentorNote || "",
        approvedByMentor: status === "Disetujui" ? mentorId : null,
        approvedAt: status === "Disetujui" ? new Date() : null,
      },
      { new: true },
    ).populate("user", "name email");

    res.json({
      message: `Laporan berhasil ${status.toLowerCase()}`,
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengupdate status laporan" });
  }
};

/* ================= GET SEMUA LAPORAN PESERTA BIMBINGAN - REVISED ================= */
export const getAllLaporanPesertaBimbingan = async (
  req: any,
  res: Response,
) => {
  try {
    const mentorId = req.user.id;

    console.log("Mentor ID:", mentorId);

    // Ambil semua pendaftaran yang disetujui dengan mentor ini
    const pendaftaranList = await Pendaftaran.find({
      status: "Disetujui",
      "peserta.mentor": mentorId,
    });

    console.log("Jumlah pendaftaran ditemukan:", pendaftaranList.length);

    // Kumpulkan semua email peserta
    const pesertaEmails: string[] = [];

    pendaftaranList.forEach((pendaftaran) => {
      pendaftaran.peserta.forEach((ps: any) => {
        if (ps.mentor && ps.mentor.toString() === mentorId) {
          pesertaEmails.push(ps.email);
        }
      });
    });

    console.log("Email peserta bimbingan:", pesertaEmails);

    // Cari user berdasarkan email
    const users = await User.find({ email: { $in: pesertaEmails } });
    const userIds = users.map((user) => user._id);

    console.log("User ditemukan:", users.length);
    console.log("User IDs:", userIds);

    // Ambil semua laporan bulanan
    const laporanList = await LaporanBulanan.find({
      user: { $in: userIds },
    })
      .populate("user", "name email")
      .sort({ month: -1 });

    console.log("Jumlah laporan ditemukan:", laporanList.length);

    res.json(laporanList);
  } catch (err: any) {
    console.error("Error getAllLaporanPesertaBimbingan:", err);
    res.status(500).json({
      message: "Gagal mengambil laporan peserta",
      error: err.message,
    });
  }
};
/* ================= GET LAPORAN PESERTA BY EMAIL (REKOMENDASI) ================= */
export const getLaporanPesertaByEmail = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { pesertaEmail, month } = req.params;

    console.log("Mencari laporan untuk email:", pesertaEmail);

    // Verifikasi bahwa mentor adalah mentor dari peserta ini
    const validasi = await Pendaftaran.findOne({
      "peserta.email": pesertaEmail,
      "peserta.mentor": mentorId,
      status: "Disetujui",
    });

    if (!validasi) {
      console.log("Validasi gagal - bukan mentor peserta");
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke laporan peserta ini",
      });
    }

    // Cari user berdasarkan email
    const user = await User.findOne({ email: pesertaEmail });

    if (!user) {
      console.log("User tidak ditemukan untuk email:", pesertaEmail);
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    console.log("User ditemukan:", user._id);

    // Cari laporan bulanan
    const laporan = await LaporanBulanan.findOne({
      user: user._id,
      month,
    }).populate("user", "name email");

    if (!laporan) {
      console.log("Laporan tidak ditemukan untuk bulan:", month);
      return res.status(404).json({
        message: "Laporan bulanan tidak ditemukan",
      });
    }

    console.log("Laporan ditemukan:", laporan._id);
    res.json(laporan);
  } catch (err: any) {
    console.error("Error getLaporanPesertaByEmail:", err);
    res.status(500).json({
      message: "Gagal mengambil laporan bulanan peserta",
      error: err.message,
    });
  }
};
