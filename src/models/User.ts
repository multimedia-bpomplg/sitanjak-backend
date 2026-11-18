import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  roles: Types.ObjectId[];
  status: "Aktif" | "Nonaktif";
  jurusan: string;
  kategoriMagang?: "PKPA" | "Reguler";
  posisiMentor?: string;
  nip?: string;
  wa?: string;
  passwordChangedAt?: Date;

  // 🔥 TAMBAHAN
  isSuperAccess?: boolean;
}

const userSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    status: {
      type: String,
      enum: ["Aktif", "Nonaktif"],
      default: "Aktif",
    },
    jurusan: { type: String, default: "" },
    kategoriMagang: {
      type: String,
      enum: ["PKPA", "Reguler"],
      default: "Reguler",
    },
    posisiMentor: {
      type: String,
      required: false,
    },
    nip: {
      type: String,
      default: "",
    },
    wa: {
      type: String,
      default: "",
    },

    passwordChangedAt: {
      type: Date,
    },

    // 🔥 ADMIN KHUSUS
    isSuperAccess: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", userSchema);
