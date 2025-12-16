import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  name: string; // contoh: superadmin, admin, mentor, peserta
  description?: string;
}

const RoleSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Role ||
  mongoose.model<IRole>("Role", RoleSchema);
