import type { GroupChannel } from "@sendbird/chat/groupChannel";
import { SendingStatus, type BaseMessage } from "@sendbird/chat/message";
import { CHANNEL_TYPE } from "../../../constants";
import type { ChannelDto, LastMessageDto, MemberDto, MessageDto } from "../types";

/** Same rule as the slice: messageId once sent, otherwise the client request id. */
export const messageKey = (m: BaseMessage): string => {
  if (m.messageId > 0) return String(m.messageId);
  const reqId = (m as { reqId?: string }).reqId;
  return `p:${reqId ?? m.createdAt}`;
};

const senderOf = (m: BaseMessage) =>
  m.isUserMessage() || m.isFileMessage() ? m.sender : null;

export const previewText = (m: BaseMessage | null): string => {
  if (!m) return "";
  if (m.isFileMessage()) {
    const t = m.type || "";
    if (t.startsWith("image/")) return "📷 Photo";
    if (t.startsWith("video/")) return "🎬 Video";
    if (t.startsWith("audio/")) return "🎵 Audio";
    return `📎 ${m.name}`;
  }
  return m.message ?? "";
};

export const toMemberDto = (m: GroupChannel["members"][number]): MemberDto => ({
  userId: m.userId,
  nickname: m.nickname || "Unknown",
  profileUrl: m.profileUrl || "",
  role: m.role === "operator" ? "operator" : "none",
});

const toLastMessage = (m: BaseMessage | null, myId: string): LastMessageDto | null => {
  if (!m) return null;
  const sender = senderOf(m);
  return {
    preview: previewText(m),
    createdAt: m.createdAt,
    senderName: sender?.nickname ?? "",
    isMine: sender?.userId === myId,
  };
};

export const toChannelDto = (c: GroupChannel, myId: string): ChannelDto => {
  // Channels created by the old app have no custom type; a distinct 2-member channel is treated as direct.
  const isDirect = c.customType === CHANNEL_TYPE.DIRECT || (!c.customType && c.isDistinct && c.memberCount === 2);
  const members = c.members.map(toMemberDto);
  const peer = isDirect ? members.find((m) => m.userId !== myId) ?? null : null;
  const others = members.filter((m) => m.userId !== myId);

  return {
    url: c.url,
    isDirect,
    title: isDirect
      ? peer?.nickname ?? "Deleted user"
      : c.name && c.name !== "Group Channel"
        ? c.name
        : others.map((m) => m.nickname).slice(0, 3).join(", ") || "Group",
    coverUrl: isDirect ? peer?.profileUrl ?? "" : c.coverUrl && !c.coverUrl.includes("sendbird.com/") ? c.coverUrl : "",
    peerId: peer?.userId ?? null,
    members,
    memberCount: c.memberCount,
    lastMessage: toLastMessage(c.lastMessage, myId),
    unreadCount: c.unreadMessageCount,
    createdAt: c.createdAt,
    typingNames: c.getTypingUsers().filter((u) => u.userId !== myId).map((u) => u.nickname || "Someone"),
    amOperator: c.myRole === "operator",
    isFrozen: c.isFrozen,
  };
};

export const toMessageDto = (m: BaseMessage, myId: string): MessageDto => {
  const sender = senderOf(m);
  const sendingStatus = (m as { sendingStatus?: SendingStatus }).sendingStatus;
  const status =
    sendingStatus === SendingStatus.PENDING
      ? "pending"
      : sendingStatus === SendingStatus.FAILED || sendingStatus === SendingStatus.CANCELED
        ? "failed"
        : "sent";

  const parent = m.parentMessage;
  const parentSender = parent ? senderOf(parent) : null;

  return {
    key: messageKey(m),
    messageId: m.messageId,
    reqId: (m as { reqId?: string }).reqId ?? "",
    channelUrl: m.channelUrl,
    kind: m.isFileMessage() ? "file" : m.isAdminMessage() ? "admin" : "user",
    text: m.isFileMessage() ? "" : m.message ?? "",
    createdAt: m.createdAt,
    edited: m.isUserMessage() && m.updatedAt > 0 && m.updatedAt - m.createdAt > 1000,
    senderId: sender?.userId ?? null,
    senderName: sender?.nickname || "Unknown",
    senderAvatar: sender?.profileUrl || "",
    isMine: sender?.userId === myId,
    status,
    parent: m.parentMessageId
      ? {
          messageId: m.parentMessageId,
          senderName: parentSender?.nickname ?? "",
          preview: parent ? previewText(parent) : "Original message",
        }
      : null,
    reactions: (m.reactions ?? [])
      .filter((r) => !r.isEmpty)
      .map((r) => ({ key: r.key, count: r.count, mine: r.hasCurrentUserReacted })),
    file: m.isFileMessage()
      ? {
          url: m.url,
          name: m.name,
          size: m.size,
          mime: m.type,
          thumbnailUrl: m.thumbnails?.[0]?.url ?? null,
        }
      : null,
  };
};
