// controllers/feedbackController.ts
import { Response } from "express";
import Feedback from "../models/Feedback";
import LaporanAkhir from "../models/LaporanAkhir";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { createNotification } from "../services/notificationService";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findAssignedMentorForPeserta(
  userId: string,
  email: string,
): Promise<{ mentorId: any; pesertaNama: string } | null> {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const emailRegex = normalizedEmail
    ? new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i")
    : null;

  const pendaftaran = await Pendaftaran.findOne({
    status: "Disetujui",
    $or: [
      { "peserta.user": userId },
      ...(emailRegex ? [{ "peserta.email": emailRegex }] : []),
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const peserta = (pendaftaran as any)?.peserta?.find(
    (p: any) =>
      p.user?.toString() === userId ||
      (normalizedEmail && p.email?.toLowerCase() === normalizedEmail),
  );

  if (!peserta?.mentor) return null;
  return {
    mentorId: peserta.mentor,
    pesertaNama: peserta.nama || "Peserta",
  };
}

function validateSurveyInput(body: any): string | null {
  const {
    kepuasanMagang,
    rekomendasiProgram,
    kemudahanProses,
    peningkatanSkill,
    feedbackBPOM,
    feedbackMentor,
  } = body || {};

  if (
    !kepuasanMagang ||
    !rekomendasiProgram ||
    !kemudahanProses ||
    !peningkatanSkill
  ) {
    return "Semua penilaian survei wajib diisi";
  }

  const scores = [
    kepuasanMagang,
    rekomendasiProgram,
    kemudahanProses,
    peningkatanSkill,
  ];
  for (const score of scores) {
    if (Number(score) < 1 || Number(score) > 5) {
      return "Nilai survei harus antara 1 sampai 5";
    }
  }

  if (!feedbackBPOM || !String(feedbackBPOM).trim() || !feedbackMentor || !String(feedbackMentor).trim()) {
    return "Masukan untuk BBPOM dan Mentor wajib diisi";
  }

  return null;
}

/* ================= CREATE FEEDBACK ================= */
export const createFeedback = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    // Wajib Laporan Akhir sudah disetujui sebelum mengisi Survei & Feedback
    const laporan = await LaporanAkhir.findOne({ user: userId });
    if (!laporan || laporan.status !== "Disetujui") {
      return res.status(403).json({
        message:
          "Survei dan feedback hanya dapat diisi setelah Laporan Akhir Anda disetujui oleh Mentor.",
      });
    }

    // ================= VALIDASI SURVEY =================
    const {
      kepuasanMagang,
      rekomendasiProgram,
      kemudahanProses,
      peningkatanSkill,
    } = req.body;

    if (
      !kepuasanMagang ||
      !rekomendasiProgram ||
      !kemudahanProses ||
      !peningkatanSkill
    ) {
      return res.status(400).json({
        message: "Semua penilaian survei wajib diisi",
      });
    }

    // ================= VALIDASI NILAI 1-5 =================
    const scores = [
      kepuasanMagang,
      rekomendasiProgram,
      kemudahanProses,
      peningkatanSkill,
    ];

    for (const score of scores) {
      if (score < 1 || score > 5) {
        return res.status(400).json({
          message: "Nilai survei harus antara 1 sampai 5",
        });
      }
    }

    // Cek apakah sudah mengirim feedback bulan ini
    const exists = await Feedback.findOne({
      user: userId,
      month: req.body.month,
    });

    if (exists) {
      return res.status(400).json({
        message: "Feedback untuk periode ini sudah dikirim",
      });
    }

    const feedback = await Feedback.create({
      user: userId,
      month: req.body.month,

      survey: {
        kepuasanMagang: req.body.kepuasanMagang,
        rekomendasiProgram: req.body.rekomendasiProgram,
        kemudahanProses: req.body.kemudahanProses,
        peningkatanSkill: req.body.peningkatanSkill,
      },

      feedbackBPOM: req.body.feedbackBPOM,
      feedbackMentor: req.body.feedbackMentor,

      isFeedbackMentorSent: true,
      feedbackMentorSentAt: new Date(),
      status: "Dikirim",
    });

    const assigned = await findAssignedMentorForPeserta(
      userId,
      req.user.email || "",
    );
    if (assigned?.mentorId) {
      await createNotification({
        recipientId: assigned.mentorId,
        title: "Survei & Feedback Baru",
        message: `${assigned.pesertaNama} telah mengirim survei dan feedback magang.`,
        type: "info",
        linkUrl: "/dashboard/mentor/ViewFeedback",
      });
    }

    res.status(201).json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan feedback" });
  }
};

/* ================= KIRIM FEEDBACK KE MENTOR ================= */
// Fungsi ini mungkin tidak diperlukan lagi karena feedback langsung terkirim
export const sendFeedbackToMentor = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const feedback = await Feedback.findOne({
      _id: id,
      user: userId,
    });

    if (!feedback) {
      return res.status(404).json({ message: "Feedback tidak ditemukan" });
    }

    if (feedback.isFeedbackMentorSent) {
      return res.status(400).json({
        message: "Feedback untuk mentor sudah pernah dikirim",
      });
    }

    // Update status pengiriman ke mentor
    feedback.isFeedbackMentorSent = true;
    feedback.feedbackMentorSentAt = new Date();
    feedback.status = "Dikirim";

    await feedback.save();

    const assigned = await findAssignedMentorForPeserta(
      userId,
      req.user.email || "",
    );
    if (assigned?.mentorId) {
      await createNotification({
        recipientId: assigned.mentorId,
        title: "Survei & Feedback Baru",
        message: `${assigned.pesertaNama} telah mengirim survei dan feedback magang.`,
        type: "info",
        linkUrl: "/dashboard/mentor/ViewFeedback",
      });
    }

    res.json({
      message: "Feedback berhasil dikirim ke mentor",
      data: feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengirim feedback ke mentor" });
  }
};

/* ================= GET FEEDBACK BY MONTH ================= */
export const getFeedbackByMonth = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { month } = req.params;

    const feedback = await Feedback.findOne({
      user: userId,
      month,
    }).populate("mentorRespondedBy", "name email");

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback tidak ditemukan",
      });
    }

    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal mengambil feedback",
    });
  }
};

/* ================= RIWAYAT FEEDBACK (PESERTA) ================= */
export const getRiwayatFeedback = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const feedback = await Feedback.find({ user: userId })
      .sort({ month: -1 })
      .select(
        "month feedbackBPOM feedbackMentor survey isFeedbackMentorSent status createdAt mentorResponse mentorRespondedAt revisionNote revisionRequestedAt",
      )
      .populate("mentorRespondedBy", "name email");

    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal mengambil riwayat feedback",
    });
  }
};

/* ================= GET FEEDBACK UNTUK MENTOR ================= */
export const getFeedbackForMentor = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;

    // Ambil semua peserta bimbingan
    const pendaftaranList = await Pendaftaran.find({
      status: "Disetujui",
      "peserta.mentor": mentorId,
    });

    const pesertaEmails: string[] = [];

    pendaftaranList.forEach((pendaftaran) => {
      pendaftaran.peserta.forEach((ps: any) => {
        if (ps.mentor && ps.mentor.toString() === mentorId) {
          pesertaEmails.push(ps.email);
        }
      });
    });

    // Cari user berdasarkan email
    const users = await User.find({ email: { $in: pesertaEmails } });
    const userIds = users.map((user) => user._id);

    // Ambil semua feedback
    const feedbackList = await Feedback.find({
      user: { $in: userIds },
    })
      .populate("user", "name email")
      .populate("mentorRespondedBy", "name email")
      .sort({ createdAt: -1 });

    // Hanya kirimkan feedbackMentor, bukan feedbackBPOM
    const sanitizedFeedback = feedbackList.map((fb) => ({
      _id: fb._id,
      month: fb.month,

      survey: fb.survey, // 🔥 TAMBAHKAN INI

      feedbackMentor: fb.feedbackMentor,
      status: fb.status,
      mentorResponse: fb.mentorResponse || "",
      revisionNote: fb.revisionNote || "",
      revisionRequestedAt: fb.revisionRequestedAt || null,
      user: fb.user,
      feedbackMentorSentAt: fb.feedbackMentorSentAt,
      createdAt: fb.createdAt,
      mentorRespondedAt: fb.mentorRespondedAt,
      mentorRespondedBy: fb.mentorRespondedBy,
      isFeedbackMentorSent: fb.isFeedbackMentorSent,
    }));

    res.json(sanitizedFeedback);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      message: "Gagal mengambil feedback",
    });
  }
};

/* ================= RESPON / REVISI FEEDBACK (MENTOR) ================= */
export const respondFeedback = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { response, status } = req.body || {};

    const targetStatus = status === "Revisi" ? "Revisi" : "Direspon";
    const noteText = typeof response === "string" ? response.trim() : "";

    if (!noteText) {
      return res.status(400).json({
        message:
          targetStatus === "Revisi"
            ? "Catatan revisi wajib diisi"
            : "Response wajib diisi",
      });
    }

    const feedback = await Feedback.findById(id).populate("user", "email name");

    if (!feedback) {
      return res.status(404).json({ message: "Feedback tidak ditemukan" });
    }

    if (
      feedback.status === "Direspon" &&
      Boolean(feedback.mentorResponse && feedback.mentorResponse.trim())
    ) {
      return res.status(400).json({
        message: "Feedback ini sudah direspon secara final oleh mentor.",
      });
    }

    // Verifikasi mentor
    const valid = await Pendaftaran.findOne({
      "peserta.email": (feedback.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    const recipientUserId = (feedback.user as any)?._id || feedback.user;

    if (targetStatus === "Revisi") {
      feedback.status = "Revisi";
      feedback.revisionNote = noteText;
      feedback.revisionRequestedAt = new Date();
      feedback.mentorResponse = "";
      feedback.mentorRespondedAt = new Date();
      feedback.mentorRespondedBy = mentorId;
      await feedback.save();

      if (recipientUserId) {
        await createNotification({
          recipientId: recipientUserId,
          title: "Revisi Survei & Feedback Diminta",
          message: `Mentor meminta revisi survei & feedback Anda: "${noteText}"`,
          type: "warning",
          linkUrl: "/dashboard/peserta/feedback",
        });
      }

      return res.json({
        message: "Permintaan revisi feedback berhasil dikirim ke peserta",
        data: feedback,
      });
    }

    // Update response final
    feedback.mentorResponse = noteText;
    feedback.revisionNote = "";
    feedback.mentorRespondedAt = new Date();
    feedback.mentorRespondedBy = mentorId;
    feedback.status = "Direspon";

    await feedback.save();

    if (recipientUserId) {
      await createNotification({
        recipientId: recipientUserId,
        title: "Feedback Direspon Mentor",
        message: "Mentor telah menanggapi survei & feedback Anda.",
        type: "success",
        linkUrl: "/dashboard/peserta/feedback",
      });
    }

    res.json({
      message: "Response berhasil dikirim",
      data: feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengirim response" });
  }
};

/* ================= REVISI FEEDBACK (PESERTA) ================= */
export const updateFeedbackRevisi = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || "").trim().toLowerCase();
    const { id } = req.params;

    const feedback = await Feedback.findOne({ _id: id, user: userId });
    if (!feedback) {
      return res.status(404).json({ message: "Feedback tidak ditemukan" });
    }

    if (feedback.status !== "Revisi") {
      return res.status(403).json({
        message:
          "Feedback hanya dapat direvisi jika Mentor meminta revisi.",
      });
    }

    const validationError = validateSurveyInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const {
      kepuasanMagang,
      rekomendasiProgram,
      kemudahanProses,
      peningkatanSkill,
      feedbackBPOM,
      feedbackMentor,
    } = req.body;

    feedback.survey = {
      kepuasanMagang: Number(kepuasanMagang),
      rekomendasiProgram: Number(rekomendasiProgram),
      kemudahanProses: Number(kemudahanProses),
      peningkatanSkill: Number(peningkatanSkill),
    };
    feedback.feedbackBPOM = String(feedbackBPOM).trim();
    feedback.feedbackMentor = String(feedbackMentor).trim();
    feedback.status = "Dikirim";
    feedback.revisionNote = "";
    feedback.isFeedbackMentorSent = true;
    feedback.feedbackMentorSentAt = new Date();
    await feedback.save();

    const assigned = await findAssignedMentorForPeserta(userId, email);
    if (assigned?.mentorId) {
      await createNotification({
        recipientId: assigned.mentorId,
        title: "Revisi Feedback Dikirim",
        message: `${assigned.pesertaNama} telah mengirim ulang revisi survei & feedback.`,
        type: "info",
        linkUrl: "/dashboard/mentor/ViewFeedback",
      });
    }

    return res.json({
      message: "Revisi survei & feedback berhasil dikirim ulang",
      data: feedback,
    });
  } catch (err) {
    console.error("[UPDATE REVISI FEEDBACK ERROR]", err);
    return res.status(500).json({
      message: "Gagal menyimpan revisi feedback",
    });
  }
};

/* ================= GET FEEDBACK UNTUK ADMIN/SUPERADMIN ================= */
export const getAllFeedback = async (req: any, res: Response) => {
  try {
    const feedbackList = await Feedback.find()
      .populate("user", "name email")
      .populate("mentorRespondedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(feedbackList);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal mengambil data feedback",
    });
  }
};

/* ================= GET DETAIL FEEDBACK ================= */
export const getFeedbackDetail = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id)
      .populate("user", "name email")
      .populate("mentorRespondedBy", "name email");

    if (!feedback) {
      return res.status(404).json({ message: "Feedback tidak ditemukan" });
    }

    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal mengambil detail feedback",
    });
  }
};
