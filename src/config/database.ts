import mongoose from "mongoose";
import chalk from "chalk";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
