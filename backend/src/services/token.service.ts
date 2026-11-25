import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { RefreshTokenModel } from "../models/RefreshToken.model";

const ISSUER = "sendbird-social";
const AUDIENCE = "sendbird-social-web";
const REUSE_GRACE_MS = 20_000;

interface AccessPayload {
  sub: string;
}

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

class TokenService {
  /** Short-lived JWT, kept only in browser memory and sent as a Bearer token. */
  public createAccessToken(userId: string): string {
    const options: SignOptions = {
      algorithm: "HS256",
      expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"],
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: userId,
    };
    return jwt.sign({}, env.JWT_SECRET, options);
  }

  public verifyAccessToken(token: string): AccessPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: ISSUER,
        audience: AUDIENCE,
      }) as jwt.JwtPayload;
      if (!payload.sub) throw new Error("missing sub");
      return { sub: payload.sub };
    } catch (err) {
      const expired = err instanceof jwt.TokenExpiredError;
      throw new AppError(HttpCode.UNAUTHORIZED, expired ? Message.SESSION_EXPIRED : Message.NOT_AUTHENTICATED);
    }
  }

  /** Creates a random refresh token. Only its hash is stored. */
  public async issueRefreshToken(userId: string, userAgent: string, family?: string) {
    const raw = crypto.randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000);
    await RefreshTokenModel.create({
      user: new Types.ObjectId(userId),
      tokenHash: sha256(raw),
      family: family ?? crypto.randomUUID(),
      expiresAt,
      userAgent: userAgent.slice(0, 300),
    });
    return { raw, expiresAt };
  }

  /**
   * Swaps a refresh token for a new one (rotation).
   * Presenting a token that was already revoked means it was probably stolen,
   * so every token in that family is revoked.
   */
  public async rotateRefreshToken(raw: string, userAgent: string) {
    const existing = await RefreshTokenModel.findOne({ tokenHash: sha256(raw) }).exec();
    if (!existing || existing.expiresAt.getTime() <= Date.now()) {
      throw new AppError(HttpCode.UNAUTHORIZED, Message.SESSION_EXPIRED);
    }
    const userId = String(existing.user);

    // Revoke atomically, so only one of several concurrent refreshes "wins".
    const claimed = await RefreshTokenModel.findOneAndUpdate(
      { _id: existing._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();

    if (!claimed) {
      // Already rotated. Within a short grace window this is a harmless race
      // (two tabs or a double request at page load), so issue another token in
      // the same family. Outside the window it looks like a stolen token:
      // revoke the whole family.
      const revokedAt = (await RefreshTokenModel.findById(existing._id).lean().exec())?.revokedAt;
      if (revokedAt && Date.now() - revokedAt.getTime() < REUSE_GRACE_MS) {
        return { userId, refresh: await this.issueRefreshToken(userId, userAgent, existing.family) };
      }
      await RefreshTokenModel.updateMany(
        { family: existing.family, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      ).exec();
      throw new AppError(HttpCode.UNAUTHORIZED, Message.SESSION_EXPIRED);
    }

    return { userId, refresh: await this.issueRefreshToken(userId, userAgent, existing.family) };
  }

  public async revokeRefreshToken(raw: string): Promise<void> {
    await RefreshTokenModel.updateOne({ tokenHash: sha256(raw), revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
  }
}

export const tokenService = new TokenService();
