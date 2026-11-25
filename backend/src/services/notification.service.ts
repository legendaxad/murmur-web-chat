import { Types } from "mongoose";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { NotificationModel, NotificationType } from "../models/Notification.model";
import { PUBLIC_USER_FIELDS, PublicUserDto, toPublicUser } from "./dto";

export interface NotificationDto {
  id: string;
  type: NotificationType;
  actor: PublicUserDto | null;
  data: { channelUrl?: string; channelName?: string; friendshipId?: string };
  readAt: string | null;
  createdAt: string;
}

class NotificationService {
  public async notify(
    userId: string,
    type: NotificationType,
    actorId: string,
    data: { channelUrl?: string; channelName?: string; friendshipId?: string } = {},
  ): Promise<void> {
    // A notification failing must never fail the action that triggered it.
    try {
      await NotificationModel.create({ user: userId, type, actor: actorId, data });
    } catch (err) {
      console.error("[notifications] failed to create", (err as Error).message);
    }
  }

  public async list(userId: string, limit: number, before?: string): Promise<NotificationDto[]> {
    const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) };
    if (before) filter.createdAt = { $lt: new Date(before) };
    const docs = await NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", PUBLIC_USER_FIELDS)
      .lean()
      .exec();

    return docs.map((d) => ({
      id: String(d._id),
      type: d.type as NotificationType,
      actor: d.actor && typeof d.actor === "object" && "username" in d.actor ? toPublicUser(d.actor as never) : null,
      data: {
        channelUrl: d.data?.channelUrl ?? undefined,
        channelName: d.data?.channelName ?? undefined,
        friendshipId: d.data?.friendshipId ? String(d.data.friendshipId) : undefined,
      },
      readAt: d.readAt ? d.readAt.toISOString() : null,
      createdAt: (d as unknown as { createdAt: Date }).createdAt.toISOString(),
    }));
  }

  public async unreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ user: userId, readAt: null }).exec();
  }

  public async markRead(userId: string, id: string): Promise<void> {
    const res = await NotificationModel.updateOne({ _id: id, user: userId }, { $set: { readAt: new Date() } }).exec();
    if (res.matchedCount === 0) throw new AppError(HttpCode.NOT_FOUND, Message.NOT_FOUND);
  }

  public async markAllRead(userId: string): Promise<void> {
    await NotificationModel.updateMany({ user: userId, readAt: null }, { $set: { readAt: new Date() } }).exec();
  }
}

export const notificationService = new NotificationService();
