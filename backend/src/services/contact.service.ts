import { Types } from "mongoose";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { blockSendbirdUser, unblockSendbirdUser } from "../lib/sendbird/users";
import { BlockModel } from "../models/Block.model";
import { FriendshipModel, FriendshipStatus, makePairKey } from "../models/Friendship.model";
import { NotificationType } from "../models/Notification.model";
import { UserModel, UserStatus } from "../models/User.model";
import { PUBLIC_USER_FIELDS, PublicUserDto, toPublicUser } from "./dto";
import { notificationService } from "./notification.service";

export type Relationship = "self" | "none" | "outgoing" | "incoming" | "contacts" | "blocked";

export interface ContactRequestDto {
  id: string;
  user: PublicUserDto;
  direction: "incoming" | "outgoing";
  createdAt: string;
}

const oid = (id: string) => new Types.ObjectId(id);

class ContactService {
  /** True if either user has blocked the other. */
  public async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const found = await BlockModel.exists({
      $or: [
        { blocker: oid(a), blocked: oid(b) },
        { blocker: oid(b), blocked: oid(a) },
      ],
    }).exec();
    return Boolean(found);
  }

  public async areContacts(a: string, b: string): Promise<boolean> {
    const f = await FriendshipModel.exists({ pairKey: makePairKey(a, b), status: FriendshipStatus.ACCEPTED }).exec();
    return Boolean(f);
  }

  /** Ids of every user that `userId` has blocked or been blocked by. */
  public async blockedIds(userId: string): Promise<string[]> {
    const blocks = await BlockModel.find({ $or: [{ blocker: oid(userId) }, { blocked: oid(userId) }] })
      .lean()
      .exec();
    return blocks.map((b) => (String(b.blocker) === userId ? String(b.blocked) : String(b.blocker)));
  }

  public async relationship(viewerId: string, targetId: string): Promise<Relationship> {
    if (viewerId === targetId) return "self";
    const iBlocked = await BlockModel.exists({ blocker: oid(viewerId), blocked: oid(targetId) }).exec();
    if (iBlocked) return "blocked";
    const f = await FriendshipModel.findOne({ pairKey: makePairKey(viewerId, targetId) }).lean().exec();
    if (!f) return "none";
    if (f.status === FriendshipStatus.ACCEPTED) return "contacts";
    return String(f.requester) === viewerId ? "outgoing" : "incoming";
  }

  public async listContacts(userId: string): Promise<PublicUserDto[]> {
    const me = oid(userId);
    const friendships = await FriendshipModel.find({
      status: FriendshipStatus.ACCEPTED,
      $or: [{ requester: me }, { recipient: me }],
    })
      .populate("requester", PUBLIC_USER_FIELDS)
      .populate("recipient", PUBLIC_USER_FIELDS)
      .lean()
      .exec();

    return friendships
      .map((f) => {
        const other = String((f.requester as { _id: unknown })._id) === userId ? f.recipient : f.requester;
        return other && typeof other === "object" && "username" in other ? toPublicUser(other as never) : null;
      })
      .filter((u): u is PublicUserDto => u !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  public async listRequests(userId: string): Promise<ContactRequestDto[]> {
    const me = oid(userId);
    const pending = await FriendshipModel.find({
      status: FriendshipStatus.PENDING,
      $or: [{ requester: me }, { recipient: me }],
    })
      .sort({ createdAt: -1 })
      .populate("requester", PUBLIC_USER_FIELDS)
      .populate("recipient", PUBLIC_USER_FIELDS)
      .lean()
      .exec();

    return pending.flatMap((f) => {
      const outgoing = String((f.requester as { _id: unknown })._id) === userId;
      const other = outgoing ? f.recipient : f.requester;
      if (!other || typeof other !== "object" || !("username" in other)) return [];
      return [
        {
          id: String(f._id),
          user: toPublicUser(other as never),
          direction: outgoing ? ("outgoing" as const) : ("incoming" as const),
          createdAt: (f as unknown as { createdAt: Date }).createdAt.toISOString(),
        },
      ];
    });
  }

  public async sendRequest(fromId: string, toId: string): Promise<{ status: "pending" | "accepted" }> {
    if (fromId === toId) throw new AppError(HttpCode.BAD_REQUEST, Message.CANNOT_TARGET_SELF);
    const target = await UserModel.exists({ _id: toId, status: UserStatus.ACTIVE }).exec();
    if (!target) throw new AppError(HttpCode.NOT_FOUND, Message.USER_NOT_FOUND);
    if (await this.isBlockedEitherWay(fromId, toId)) throw new AppError(HttpCode.FORBIDDEN, Message.USER_BLOCKED);

    const pairKey = makePairKey(fromId, toId);
    const existing = await FriendshipModel.findOne({ pairKey }).exec();

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) throw new AppError(HttpCode.CONFLICT, Message.ALREADY_FRIENDS);
      if (String(existing.requester) === fromId) throw new AppError(HttpCode.CONFLICT, Message.REQUEST_ALREADY_SENT);
      // The other person already asked us, so treat this as accepting their request.
      await this.accept(fromId, String(existing._id));
      return { status: "accepted" };
    }

    const created = await FriendshipModel.create({ pairKey, requester: fromId, recipient: toId });
    await notificationService.notify(toId, NotificationType.CONTACT_REQUEST, fromId, { friendshipId: String(created._id) });
    return { status: "pending" };
  }

  /** Only the recipient can accept. */
  public async accept(userId: string, requestId: string): Promise<void> {
    const f = await FriendshipModel.findOneAndUpdate(
      { _id: requestId, recipient: oid(userId), status: FriendshipStatus.PENDING },
      { $set: { status: FriendshipStatus.ACCEPTED, acceptedAt: new Date() } },
      { new: true },
    ).exec();
    if (!f) throw new AppError(HttpCode.NOT_FOUND, Message.REQUEST_NOT_FOUND);
    await notificationService.notify(String(f.requester), NotificationType.CONTACT_ACCEPTED, userId);
  }

  /** The recipient declines, or the requester cancels. Either way the request is deleted. */
  public async removeRequest(userId: string, requestId: string): Promise<void> {
    const res = await FriendshipModel.deleteOne({
      _id: requestId,
      status: FriendshipStatus.PENDING,
      $or: [{ requester: oid(userId) }, { recipient: oid(userId) }],
    }).exec();
    if (res.deletedCount === 0) throw new AppError(HttpCode.NOT_FOUND, Message.REQUEST_NOT_FOUND);
  }

  public async removeContact(userId: string, otherId: string): Promise<void> {
    await FriendshipModel.deleteOne({ pairKey: makePairKey(userId, otherId) }).exec();
  }

  public async block(userId: string, targetId: string): Promise<void> {
    if (userId === targetId) throw new AppError(HttpCode.BAD_REQUEST, Message.CANNOT_TARGET_SELF);
    const target = await UserModel.exists({ _id: targetId }).exec();
    if (!target) throw new AppError(HttpCode.NOT_FOUND, Message.USER_NOT_FOUND);

    await BlockModel.updateOne(
      { blocker: oid(userId), blocked: oid(targetId) },
      { $setOnInsert: { blocker: oid(userId), blocked: oid(targetId) } },
      { upsert: true },
    ).exec();
    // Blocking also ends the contact relationship or any pending request.
    await FriendshipModel.deleteOne({ pairKey: makePairKey(userId, targetId) }).exec();
    await blockSendbirdUser(userId, targetId);
  }

  public async unblock(userId: string, targetId: string): Promise<void> {
    await BlockModel.deleteOne({ blocker: oid(userId), blocked: oid(targetId) }).exec();
    await unblockSendbirdUser(userId, targetId);
  }

  public async listBlocked(userId: string): Promise<PublicUserDto[]> {
    const blocks = await BlockModel.find({ blocker: oid(userId) }).populate("blocked", PUBLIC_USER_FIELDS).lean().exec();
    return blocks
      .map((b) => b.blocked)
      .filter((u): u is never => Boolean(u) && typeof u === "object" && "username" in (u as object))
      .map((u) => toPublicUser(u));
  }
}

export const contactService = new ContactService();
