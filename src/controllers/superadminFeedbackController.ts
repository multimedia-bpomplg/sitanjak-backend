// D:\Projek BPOM\backend-bpom\src\controllers\superadminFeedbackController.ts
import { Request, Response } from "express";
import Feedback from "../models/Feedback";

/* ================= GET ALL FEEDBACK (SUPERADMIN) ================= */
export const getAllFeedback = async (req: any, res: Response) => {
  try {
    const feedbackList = await Feedback.find()
      .populate("user", "name email")
      .populate("mentorRespondedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(feedbackList);
  } catch (err) {
    console.error("[GET ALL FEEDBACK]", err);
    res.status(500).json({ message: "Gagal mengambil data feedback" });
  }
};

/* ================= GET FEEDBACK STATISTICS ================= */
export const getFeedbackStatistics = async (req: any, res: Response) => {
  try {
    const feedbackList = await Feedback.find();

    const statistics = {
      total: feedbackList.length,
      sentToMentor: feedbackList.filter((f) => f.isFeedbackMentorSent).length,
      notSentToMentor: feedbackList.filter((f) => !f.isFeedbackMentorSent)
        .length,
      responded: feedbackList.filter((f) => f.mentorResponse).length,
      unresponded: feedbackList.filter(
        (f) => !f.mentorResponse && f.isFeedbackMentorSent,
      ).length,
      byMonth: {} as Record<string, number>,
      byStatus: {
        Dikirim: feedbackList.filter((f) => f.status === "Dikirim").length,
        Dibaca: feedbackList.filter((f) => f.status === "Dibaca").length,
        Direspon: feedbackList.filter((f) => f.status === "Direspon").length,
      },
    };

    // Group by month
    feedbackList.forEach((f) => {
      if (f.month) {
        statistics.byMonth[f.month] = (statistics.byMonth[f.month] || 0) + 1;
      }
    });

    res.json(statistics);
  } catch (err) {
    console.error("[GET FEEDBACK STATISTICS]", err);
    res.status(500).json({ message: "Gagal mengambil statistik feedback" });
  }
};

/* ================= GET FEEDBACK BY USER ================= */
export const getFeedbackByUser = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    const feedbackList = await Feedback.find({ user: userId })
      .populate("user", "name email")
      .populate("mentorRespondedBy", "name email")
      .sort({ month: -1 });

    res.json(feedbackList);
  } catch (err) {
    console.error("[GET FEEDBACK BY USER]", err);
    res.status(500).json({ message: "Gagal mengambil feedback user" });
  }
};

/* ================= GET FEEDBACK DETAIL ================= */
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
    console.error("[GET FEEDBACK DETAIL]", err);
    res.status(500).json({ message: "Gagal mengambil detail feedback" });
  }
};

/* ================= GET PESERTA FEEDBACK SUMMARY ================= */
export const getPesertaFeedbackSummary = async (req: any, res: Response) => {
  try {
    const feedbackList = await Feedback.find().populate("user", "name email");

    const pesertaMap = new Map();

    feedbackList.forEach((feedback) => {
      if (!feedback.user) return;

      const user =
        typeof feedback.user === "object" && "name" in feedback.user
          ? (feedback.user as any)
          : null;

      if (!user) return;

      const userId = user._id.toString();

      if (!pesertaMap.has(userId)) {
        pesertaMap.set(userId, {
          _id: userId,
          name: user.name,
          email: user.email,
          totalFeedback: 0,
          sentToMentor: 0,
          notSentToMentor: 0,
          responded: 0,
          unresponded: 0,
          feedbackMonths: [],
          lastFeedbackDate: null,
        });
      }

      const peserta = pesertaMap.get(userId);
      peserta.totalFeedback++;

      if (feedback.isFeedbackMentorSent) {
        peserta.sentToMentor++;
        if (feedback.mentorResponse) {
          peserta.responded++;
        } else {
          peserta.unresponded++;
        }
      } else {
        peserta.notSentToMentor++;
      }

      // Tambahkan bulan ke array
      if (!peserta.feedbackMonths.includes(feedback.month)) {
        peserta.feedbackMonths.push(feedback.month);
      }

      // Update last feedback date
      if (
        !peserta.lastFeedbackDate ||
        new Date(feedback.createdAt) > new Date(peserta.lastFeedbackDate)
      ) {
        peserta.lastFeedbackDate = feedback.createdAt;
      }
    });

    // Sort months untuk setiap peserta
    pesertaMap.forEach((peserta) => {
      peserta.feedbackMonths.sort((a: string, b: string) => {
        const [yearA, monthA] = a.split("-").map(Number);
        const [yearB, monthB] = b.split("-").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      });
    });

    const pesertaArray = Array.from(pesertaMap.values()).sort((a, b) => {
      if (!a.lastFeedbackDate) return 1;
      if (!b.lastFeedbackDate) return -1;
      return (
        new Date(b.lastFeedbackDate).getTime() -
        new Date(a.lastFeedbackDate).getTime()
      );
    });

    res.json(pesertaArray);
  } catch (err) {
    console.error("[GET PESERTA FEEDBACK SUMMARY]", err);
    res
      .status(500)
      .json({ message: "Gagal mengambil ringkasan feedback peserta" });
  }
};
