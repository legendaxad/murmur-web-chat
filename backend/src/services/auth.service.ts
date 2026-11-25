import bcrypt from "bcryptjs";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { deleteSendbirdUser, issueSessionToken, upsertSendbirdUser } from "../lib/sendbird/users";
import { UserDocument, UserModel, UserStatus } from "../models/User.model";
import { LoginInput, RegisterInput } from "../validators";
import { env } from "../config/env";
import { tokenService } from "./token.service";

const BCRYPT_ROUNDS = 12;
// Compared against when the user doesn't exist, so the response takes the same
// time either way and doesn't reveal which usernames exist.
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-not-a-password", BCRYPT_ROUNDS);

export interface AuthResult {
  user: UserDocument;
  accessToken: string;
  refresh: { raw: string; expiresAt: Date };
}

class AuthService {
  public async register(input: RegisterInput, userAgent: string): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await UserModel.create({
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });

    // Sendbird user id = Mongo _id (same convention as before).
    // If Sendbird fails, roll back so we don't leave a half-created account.
    try {
      await upsertSendbirdUser(user.id, user.displayName, user.avatarUrl);
    } catch (err) {
      await UserModel.deleteOne({ _id: user._id }).exec();
      await deleteSendbirdUser(user.id).catch(() => undefined);
      throw err;
    }

    return this.startSession(user, userAgent);
  }

  public async login(input: LoginInput, userAgent: string): Promise<AuthResult> {
    const field = input.identifier.includes("@") ? "email" : "username";
    const user = await UserModel.findOne({ [field]: input.identifier, status: { $ne: UserStatus.DELETED } })
      .select("+passwordHash")
      .exec();

    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new AppError(HttpCode.UNAUTHORIZED, Message.INVALID_CREDENTIALS);
    if (user.status === UserStatus.BLOCKED) throw new AppError(HttpCode.FORBIDDEN, Message.ACCOUNT_BLOCKED);

    user.lastLoginAt = new Date();
    await user.save();
    return this.startSession(user, userAgent);
  }

  public async refresh(rawRefreshToken: string, userAgent: string): Promise<AuthResult> {
    const { userId, refresh } = await tokenService.rotateRefreshToken(rawRefreshToken, userAgent);
    const user = await this.getActiveUser(userId);
    return { user, accessToken: tokenService.createAccessToken(user.id), refresh };
  }

  public async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) await tokenService.revokeRefreshToken(rawRefreshToken);
  }

  public async getActiveUser(userId: string): Promise<UserDocument> {
    const user = await UserModel.findById(userId).exec();
    if (!user || user.status === UserStatus.DELETED) throw new AppError(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    if (user.status === UserStatus.BLOCKED) throw new AppError(HttpCode.FORBIDDEN, Message.ACCOUNT_BLOCKED);
    return user;
  }

  /**
   * Gives the signed-in user a Sendbird session token. Only the backend can
   * create these, which means a Sendbird connection always belongs to a user
   * our app has authenticated.
   */
  public async createSendbirdSession(userId: string) {
    const user = await this.getActiveUser(userId);
    const { token, expiresAt } = await issueSessionToken(user.id, env.SENDBIRD_SESSION_TTL_HOURS * 3600 * 1000);
    return { appId: env.SENDBIRD_APP_ID, userId: user.id, token, expiresAt };
  }

  private async startSession(user: UserDocument, userAgent: string): Promise<AuthResult> {
    const refresh = await tokenService.issueRefreshToken(user.id, userAgent);
    return { user, accessToken: tokenService.createAccessToken(user.id), refresh };
  }
}

export const authService = new AuthService();
