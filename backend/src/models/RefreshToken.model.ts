import { Schema, Types, model } from "mongoose";

/**
 * Opaque refresh tokens, stored only as SHA-256 hashes.
 * `family` groups a chain of rotated tokens. If a token that was already used
 * is presented again, the whole family is revoked (reuse detection).
 */
const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false },
);

// MongoDB deletes expired tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export interface RefreshTokenDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema, "refresh_tokens");
