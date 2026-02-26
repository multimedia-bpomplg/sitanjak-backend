import { Store } from "express-rate-limit";
import mongoose from "mongoose";

// Schema untuk rate limit
const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true },
  type: { type: String, required: true },
  count: { type: Number, default: 1 },
  resetAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index - auto delete setelah reset
rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

// Composite index untuk query cepat
rateLimitSchema.index({ key: 1, type: 1 }, { unique: true });

const RateLimit =
  mongoose.models.RateLimit || mongoose.model("RateLimit", rateLimitSchema);

// Custom Store yang menggunakan koneksi MongoDB yang sama
export class MongoStore implements Store {
  private type: string;
  private windowMs: number;

  constructor(type: string, windowMs: number) {
    this.type = type;
    this.windowMs = windowMs;
  }

  async increment(
    key: string,
  ): Promise<{ totalHits: number; resetTime: Date }> {
    const now = new Date();
    const resetTime = new Date(now.getTime() + this.windowMs);

    try {
      // Atomic upsert dengan increment
      const result = await RateLimit.findOneAndUpdate(
        {
          key: `${this.type}:${key}`,
          type: this.type,
          resetAt: { $gt: now }, // Masih dalam window
        },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            resetAt: resetTime,
            createdAt: now,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      return {
        totalHits: result.count,
        resetTime: result.resetAt,
      };
    } catch (error) {
      console.error("Rate limit increment error:", error);

      // Fallback: return default
      return {
        totalHits: 1,
        resetTime,
      };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await RateLimit.findOneAndUpdate(
        { key: `${this.type}:${key}`, type: this.type },
        { $inc: { count: -1 } },
      );
    } catch (error) {
      console.error("Rate limit decrement error:", error);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await RateLimit.deleteOne({
        key: `${this.type}:${key}`,
        type: this.type,
      });
    } catch (error) {
      console.error("Rate limit reset error:", error);
    }
  }

  async resetAll(): Promise<void> {
    try {
      await RateLimit.deleteMany({ type: this.type });
    } catch (error) {
      console.error("Rate limit reset all error:", error);
    }
  }
}
