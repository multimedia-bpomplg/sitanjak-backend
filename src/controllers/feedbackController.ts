// controllers/feedbackController.ts
import { Response } from "express";
import Feedback from "../models/Feedback";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";

/* ================= CREATE FEEDBACK ================= */
export const createFeedback = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

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
        "month feedbackBPOM feedbackMentor survey isFeedbackMentorSent status createdAt mentorResponse mentorRespondedAt",
      );

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

/* ================= RESPON FEEDBACK (MENTOR) ================= */
export const respondFeedback = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({
        message: "Response wajib diisi",
      });
    }

    const feedback = await Feedback.findById(id).populate("user", "email");

    if (!feedback) {
      return res.status(404).json({ message: "Feedback tidak ditemukan" });
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

    // Update response
    feedback.mentorResponse = response;
    feedback.mentorRespondedAt = new Date();
    feedback.mentorRespondedBy = mentorId;
    feedback.status = "Direspon";

    await feedback.save();

    res.json({
      message: "Response berhasil dikirim",
      data: feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengirim response" });
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
