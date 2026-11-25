import { AppError, HttpCode, Message } from "../errors/AppError";
import {
  ChannelCustomType,
  createGroupChannel,
  getGroupChannel,
  inviteToChannel,
  isChannelMember,
} from "../lib/sendbird/channels";
import { NotificationType } from "../models/Notification.model";
import { DmPolicy, UserModel, UserStatus } from "../models/User.model";
import { contactService } from "./contact.service";
import { notificationService } from "./notification.service";

export interface ConversationDto {
  channelUrl: string;
}

/**
 * Creating channels and adding members happens on the server, where our
 * rules can be enforced (blocks, DM policy, contacts only).
 * Messages are still sent directly between the browser and Sendbird.
 */
class ConversationService {
  public async createDirect(meId: string, otherId: string): Promise<ConversationDto> {
    if (meId === otherId) throw new AppError(HttpCode.BAD_REQUEST, Message.CANNOT_TARGET_SELF);

    const other = await UserModel.findOne({ _id: otherId, status: UserStatus.ACTIVE }).exec();
    if (!other) throw new AppError(HttpCode.NOT_FOUND, Message.USER_NOT_FOUND);
    if (await contactService.isBlockedEitherWay(meId, otherId)) throw new AppError(HttpCode.FORBIDDEN, Message.USER_BLOCKED);
    if (other.settings?.dmPolicy === DmPolicy.CONTACTS && !(await contactService.areContacts(meId, otherId))) {
      throw new AppError(HttpCode.FORBIDDEN, Message.DM_NOT_ALLOWED);
    }

    // is_distinct: Sendbird returns the existing 1:1 channel if there already is one.
    const channel = await createGroupChannel({
      userIds: [meId, otherId],
      isDistinct: true,
      customType: ChannelCustomType.DIRECT,
    });
    return { channelUrl: channel.channel_url };
  }

  public async createGroup(meId: string, name: string, memberIds: string[], coverUrl?: string): Promise<ConversationDto> {
    const unique = [...new Set(memberIds.filter((id) => id !== meId))];
    if (unique.length === 0) throw new AppError(HttpCode.BAD_REQUEST, Message.GROUP_MEMBERS_MUST_BE_CONTACTS);
    await this.assertAllContacts(meId, unique);

    const channel = await createGroupChannel({
      userIds: [meId, ...unique],
      isDistinct: false,
      customType: ChannelCustomType.GROUP,
      name,
      coverUrl,
      operatorIds: [meId],
    });

    await Promise.all(
      unique.map((id) =>
        notificationService.notify(id, NotificationType.GROUP_ADDED, meId, { channelUrl: channel.channel_url, channelName: name }),
      ),
    );
    return { channelUrl: channel.channel_url };
  }

  public async addMembers(meId: string, channelUrl: string, userIds: string[]): Promise<void> {
    const channel = await getGroupChannel(channelUrl);
    if (channel.custom_type !== ChannelCustomType.GROUP) throw new AppError(HttpCode.BAD_REQUEST, Message.NOT_A_GROUP);
    if (!(await isChannelMember(channelUrl, meId))) throw new AppError(HttpCode.FORBIDDEN, Message.NOT_A_MEMBER);

    const unique = [...new Set(userIds.filter((id) => id !== meId))];
    await this.assertAllContacts(meId, unique);
    await inviteToChannel(channelUrl, meId, unique);

    await Promise.all(
      unique.map((id) =>
        notificationService.notify(id, NotificationType.GROUP_ADDED, meId, { channelUrl, channelName: channel.name }),
      ),
    );
  }

  private async assertAllContacts(meId: string, userIds: string[]): Promise<void> {
    const checks = await Promise.all(
      userIds.map(async (id) => (await contactService.areContacts(meId, id)) && !(await contactService.isBlockedEitherWay(meId, id))),
    );
    if (checks.some((ok) => !ok)) throw new AppError(HttpCode.FORBIDDEN, Message.GROUP_MEMBERS_MUST_BE_CONTACTS);
  }
}

export const conversationService = new ConversationService();
