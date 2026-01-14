import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  roles: Types.ObjectId[];
  status: "Aktif" | "Nonaktif";
  jurusan: string;
  posisiMentor?: string;
  passwordChangedAt?: Date;
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
    posisiMentor: {
      type: String,
      required: false,
    },

    pesertaBimbingan: {
      type: [String],
      default: [],
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", userSchema);
