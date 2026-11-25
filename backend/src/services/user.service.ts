import { Types } from "mongoose";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { getSendbirdUsers, updateSendbirdUser } from "../lib/sendbird/users";
import { BlockModel } from "../models/Block.model";
import { UserModel, UserStatus } from "../models/User.model";
import { escapeRegex } from "../utils/http";
import { UpdateMeInput } from "../validators";
import { contactService, Relationship } from "./contact.service";
import { MeDto, PUBLIC_USER_FIELDS, PublicUserDto, toMe, toPublicUser } from "./dto";

export interface ProfileDto extends PublicUserDto {
  relationship: Relationship;
  memberSince: string;
}

export interface PresenceDto {
  userId: string;
  online: boolean;
  lastSeenAt: number | null;
}

class UserService {
  public async getMe(userId: string): Promise<MeDto> {
    const user = await UserModel.findById(userId).exec();
    if (!user) throw new AppError(HttpCode.NOT_FOUND, Message.USER_NOT_FOUND);
    return toMe(user);
  }

  public async updateMe(userId: string, input: UpdateMeInput): Promise<MeDto> {
    const user = await UserModel.findById(userId).exec();
    if (!user) throw new AppError(HttpCode.NOT_FOUND, Message.USER_NOT_FOUND);

    const nicknameChanged = input.displayName !== undefined && input.displayName !== user.displayName;
    const avatarChanged = input.avatarUrl !== undefined && input.avatarUrl !== user.avatarUrl;

    if (input.displayName !== undefined) user.displayName = input.displayName;
    if (input.bio !== undefined) user.bio = input.bio;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    if (input.settings?.discoverable !== undefined) user.set("settings.discoverable", input.settings.discoverable);
    if (input.settings?.dmPolicy !== undefined) user.set("settings.dmPolicy", input.settings.dmPolicy);

    // Update Sendbird first: if it fails, nothing is saved, so the two never disagree.
    if (nicknameChanged || avatarChanged) {
      await updateSendbirdUser(user.id, {
        nickname: nicknameChanged ? user.displayName : undefined,
        profileUrl: avatarChanged ? user.avatarUrl : undefined,
      });
    }
    await user.save();
    return toMe(user);
  }

  /** Discovery: only active, discoverable users, never anyone in a block relationship with the viewer. */
  public async search(viewerId: string, q: string): Promise<(PublicUserDto & { relationship: Relationship })[]> {
    const excluded = [viewerId, ...(await contactService.blockedIds(viewerId))].map((id) => new Types.ObjectId(id));
    const pattern = new RegExp("^" + escapeRegex(q.replace(/^@/, "")), "i");

    const users = await UserModel.find({
      _id: { $nin: excluded },
      status: UserStatus.ACTIVE,
      "settings.discoverable": { $ne: false },
      $or: [{ username: pattern }, { displayName: pattern }],
    })
      .select(PUBLIC_USER_FIELDS)
      .limit(20)
      .lean()
      .exec();

    return Promise.all(
      users.map(async (u) => ({ ...toPublicUser(u), relationship: await contactService.relationship(viewerId, String(u._id)) })),
    );
  }

  public async getProfile(viewerId: string, targetId: string): Promise<ProfileDto> {
    const user = await UserModel.findOne({ _id: targetId, status: UserStatus.ACTIVE }).exec();
    // If they blocked the viewer, answer as if they don't exist (no hint that a block exists).
    const blockedViewer = await BlockModel.exists({ blocker: targetId, blocked: viewerId }).exec();
    if (!user || blockedViewer) throw new AppError(HttpCode.NOT_FOUND, Message.USER_NOT_FOUND);

    return {
      ...toPublicUser(user),
      relationship: await contactService.relationship(viewerId, targetId),
      memberSince: user.createdAt.toISOString(),
    };
  }

  /** Presence comes from Sendbird, which tracks the real connection state. */
  public async presence(userIds: string[]): Promise<PresenceDto[]> {
    const users = await getSendbirdUsers(userIds);
    return users.map((u) => ({
      userId: u.user_id,
      online: u.is_online,
      lastSeenAt: !u.is_online && u.last_seen_at > 0 ? u.last_seen_at : null,
    }));
  }
}

export const userService = new UserService();
