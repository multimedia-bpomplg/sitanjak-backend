import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsapp extends Document {
  phoneNumber: string;
  groupId?: string;
  groupName?: string;
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId;
}

const WhatsappSchema = new Schema<IWhatsapp>(
  {
    phoneNumber: {
      type: String,
      required: [true, "Nomor WhatsApp wajib diisi"],
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^62\d{9,12}$/.test(v);
        },
        message: (props: any) =>
          `${props.value} bukan format nomor yang valid! Harus diawali 62`,
      },
    },
    groupId: {
      type: String,
      default: null,
    },

    groupName: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID wajib diisi"],
    },
  },
  {
    timestamps: true,
  },
);

/**
 * ✅ FIXED PRE-SAVE MIDDLEWARE
 * Tidak menggunakan next()
 * Karena sudah async/await
 */
WhatsappSchema.pre("save", async function () {
  try {
    console.log("🔄 Pre-save middleware:", this.phoneNumber);

    if (this.isActive) {
      await mongoose.model("Whatsapp").updateMany(
        {
          _id: { $ne: this._id },
          isActive: true,
        },
        {
          isActive: false,
        },
      );

      console.log("✅ Nomor lain berhasil dinonaktifkan");
    }
  } catch (error) {
    console.error("❌ Error di pre-save:", error);
    throw error; // lempar ke controller
  }
});

// Cegah overwrite model
const WhatsappModel =
  mongoose.models.Whatsapp ||
  mongoose.model<IWhatsapp>("Whatsapp", WhatsappSchema);

export default WhatsappModel;
