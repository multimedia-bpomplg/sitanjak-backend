import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import User from "../models/User";

interface FeedbackDetail {
  _id: string;
  month: string;
  feedbackBPOM: string;
  feedbackMentor: string;
  isFeedbackMentorSent: boolean;
  status: string;
  mentorResponse?: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  mentorRespondedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  feedbackMentorSentAt?: string;
  mentorRespondedAt?: string;
  createdAt: string;
}

interface Statistics {
  total: number;
  sentToMentor: number;
  notSentToMentor: number;
  responded: number;
  unresponded: number;
}

/* ================= DOWNLOAD ALL FEEDBACK PDF ================= */
export const downloadAllFeedbackPDF = async (req: any, res: Response) => {
  try {
    const { feedbackList, statistics, date } = req.body;

    if (
      !feedbackList ||
      !Array.isArray(feedbackList) ||
      feedbackList.length === 0
    ) {
      return res.status(400).json({
        message: "Tidak ada data feedback untuk diunduh",
      });
    }

    // Header download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan-feedback-${new Date().toISOString().split("T")[0]}.pdf`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
    });

    doc.pipe(res);

    // ================= HEADER =================
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#7F1D1D")
      .text("LAPORAN FEEDBACK PESERTA MAGANG", {
        align: "center",
      });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#333333")
      .text(
        `Tanggal Cetak: ${new Date(date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        {
          align: "center",
        },
      );

    doc.moveDown(2);

    // ================= STATISTIK =================
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#7F1D1D")
      .text("RINGKASAN STATISTIK", {
        underline: true,
      });

    doc.moveDown(0.5);

    // Buat tabel statistik
    const stats = [
      {
        label: "Total Feedback",
        value: statistics?.total || feedbackList.length,
      },
      { label: "Terkirim ke Mentor", value: statistics?.sentToMentor || 0 },
      { label: "Draft (BPOM)", value: statistics?.notSentToMentor || 0 },
      { label: "Direspon Mentor", value: statistics?.responded || 0 },
      { label: "Menunggu Respon", value: statistics?.unresponded || 0 },
    ];

    let startY = doc.y;

    stats.forEach((stat, index) => {
      const x = index % 2 === 0 ? 50 : 300;
      const y = startY + Math.floor(index / 2) * 40;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#333333")
        .text(stat.label, x, y, { width: 200 });

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#7F1D1D")
        .text(stat.value.toString(), x, y + 15, { width: 200 });
    });

    doc.moveDown(4);

    // ================= GROUP BY PESERTA =================
    // Group feedback by user
    const feedbackByUser = feedbackList.reduce(
      (acc: any, feedback: FeedbackDetail) => {
        const userId = feedback.user._id;
        if (!acc[userId]) {
          acc[userId] = {
            user: feedback.user,
            feedbacks: [],
          };
        }
        acc[userId].feedbacks.push(feedback);
        return acc;
      },
      {},
    );

    let pageCount = 1;

    for (const [userId, data] of Object.entries(feedbackByUser)) {
      const { user, feedbacks } = data as any;

      // Check if need new page
      if (doc.y > 700) {
        doc.addPage();
        pageCount++;
      }

      // ================= USER HEADER =================
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#7F1D1D")
        .text(`PESERTA: ${user.name}`, {
          underline: true,
        });

      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#333333")
        .text(`Email: ${user.email}`);

      doc.moveDown(0.5);

      // Hitung statistik per user
      const userStats = {
        total: feedbacks.length,
        sentToMentor: feedbacks.filter(
          (f: FeedbackDetail) => f.isFeedbackMentorSent,
        ).length,
        responded: feedbacks.filter((f: FeedbackDetail) => f.mentorResponse)
          .length,
      };

      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor("#666666")
        .text(
          `Total: ${userStats.total} | Terkirim ke Mentor: ${userStats.sentToMentor} | Direspon: ${userStats.responded}`,
        );

      doc.moveDown(1);

      // ================= FEEDBACK LIST =================
      // Sort feedback by month (descending)
      const sortedFeedbacks = (feedbacks as FeedbackDetail[]).sort((a, b) => {
        const [yearA, monthA] = a.month.split("-").map(Number);
        const [yearB, monthB] = b.month.split("-").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      });

      for (const feedback of sortedFeedbacks) {
        // Check if need new page
        if (doc.y > 700) {
          doc.addPage();
          pageCount++;
        }

        // Format month
        const [year, month] = feedback.month.split("-");
        const monthName = new Date(
          parseInt(year),
          parseInt(month) - 1,
        ).toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });

        // Status badge color
        const statusColor =
          feedback.status === "Disetujui"
            ? "#10B981"
            : feedback.status === "Ditolak"
              ? "#EF4444"
              : feedback.status === "Perbaiki"
                ? "#F59E0B"
                : "#6B7280";

        // ===== FEEDBACK CARD =====
        doc.fillColor("#F3F4F6").rect(doc.x, doc.y, 500, 5).fill();

        doc
          .fillColor("#1F2937")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`Periode: ${monthName}`, {
            continued: true,
          });

        doc
          .fillColor(statusColor)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(`  [${feedback.status}]`, { align: "right" });

        doc.moveDown(0.3);

        doc
          .fillColor("#333333")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("Feedback untuk BPOM:");

        doc
          .fontSize(9)
          .font("Helvetica")
          .text(feedback.feedbackBPOM || "-", {
            indent: 20,
            align: "justify",
          });

        doc.moveDown(0.3);

        doc.fontSize(10).font("Helvetica-Bold").text("Feedback untuk Mentor:");

        doc
          .fontSize(9)
          .font("Helvetica")
          .text(feedback.feedbackMentor || "-", {
            indent: 20,
            align: "justify",
          });

        // Status pengiriman
        doc.moveDown(0.3);

        const sentStatus = feedback.isFeedbackMentorSent
          ? feedback.mentorResponse
            ? "✓ Direspon Mentor"
            : "➤ Terkirim ke Mentor"
          : "✗ Draft (Belum Terkirim)";

        doc
          .fontSize(8)
          .font("Helvetica-Oblique")
          .fillColor("#6B7280")
          .text(sentStatus, { align: "right" });

        // Response mentor jika ada
        if (feedback.mentorResponse) {
          doc.moveDown(0.2);

          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor("#7F1D1D")
            .text("Response Mentor:");

          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("#333333")
            .text(feedback.mentorResponse, {
              indent: 20,
              align: "justify",
            });

          if (feedback.mentorRespondedBy) {
            doc
              .fontSize(7)
              .font("Helvetica-Oblique")
              .fillColor("#9CA3AF")
              .text(
                `- ${feedback.mentorRespondedBy.name} (${new Date(feedback.mentorRespondedAt || "").toLocaleDateString("id-ID")})`,
                { align: "right" },
              );
          }
        }

        doc.moveDown(0.5);

        // Garis pemisah
        doc
          .strokeColor("#E5E7EB")
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke();

        doc.moveDown(0.5);
      }

      doc.moveDown(1);
    }

    // ================= FOOTER =================
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .fillColor("#9CA3AF")
        .text(
          `Halaman ${i + 1} dari ${totalPages} - Dihasilkan oleh Sistem Magang BPOM`,
          50,
          doc.page.height - 50,
          { align: "center", width: doc.page.width - 100 },
        );
    }

    doc.end();
  } catch (err) {
    console.error("[DOWNLOAD FEEDBACK PDF]", err);
    res.status(500).json({
      message: "Gagal membuat PDF feedback",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
