import mongoose from "mongoose";

const LogbookSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },

    status: {
      type: String,
      enum: ["hadir", "tidak_hadir_keterangan", "tidak_hadir_tanpa_keterangan"],
      required: true,
    },

    judul: String,
    pengalaman: String,
    kendala: String,
    keterangan: String,

    files: [String], // simpan PATH / URL foto
    approvedByMentor: {
      type: Boolean,
      default: false,
    },

    mentorNote: {
      type: String,
      default: "",
    },
  },

  { timestamps: true }
);

/* 🔒 1 USER 1 LOGBOOK PER TANGGAL */
LogbookSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("Logbook", LogbookSchema);
