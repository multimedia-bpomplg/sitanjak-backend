// models/Feedback.ts
import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String, // YYYY-MM
      required: true,
    },

    /* ===== FEEDBACK UNTUK BPOM ===== */
    feedbackBPOM: {
      type: String,
      required: true,
    },

    /* ===== FEEDBACK UNTUK MENTOR ===== */
    feedbackMentor: {
      type: String,
      required: true,
    },

    /* ===== STATUS PENGIRIMAN ===== */
    isFeedbackMentorSent: {
      type: Boolean,
      default: false,
    },

    feedbackMentorSentAt: {
      type: Date,
    },

    /* ===== RESPONSE DARI MENTOR ===== */
    mentorResponse: {
      type: String,
      default: "",
    },

    mentorRespondedAt: {
      type: Date,
    },

    mentorRespondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* ===== STATUS FEEDBACK ===== */
    status: {
      type: String,
      enum: ["Dikirim", "Dibaca", "Direspon"],
      default: "Dikirim",
    },
    /* ===== SURVEY PENILAIAN (1-5) ===== */
    survey: {
      kepuasanMagang: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      rekomendasiProgram: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      kemudahanProses: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      peningkatanSkill: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
    },
  },
  { timestamps: true },
);

/* 🔒 1 USER 1 FEEDBACK PER BULAN (UNTUK BPOM) */
FeedbackSchema.index({ user: 1, month: 1 }, { unique: true });

export default mongoose.model("Feedback", FeedbackSchema);
