import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    subtitle: {
      type: String, // khusus landing
      default: null,
    },

    content: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["landing", "admin", "mentor", "peserta"],
      required: true,
    },

    image: {
      type: String,
      default: null,
    },

    // ✅ TAMBAHKAN INI
    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Announcement", AnnouncementSchema);
