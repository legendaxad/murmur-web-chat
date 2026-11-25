/**
 * Serializable shapes of Sendbird data, the only messaging data kept in Redux.
 * SDK instances (GroupChannel, BaseMessage) stay inside the sendbird/ layer.
 */

export type ConnectionStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "error";

export interface MemberDto {
  userId: string;
  nickname: string;
  profileUrl: string;
  role: "operator" | "none";
}

export interface LastMessageDto {
  preview: string;
  createdAt: number;
  senderName: string;
  isMine: boolean;
}

export interface ChannelDto {
  url: string;
  isDirect: boolean;
  /** For direct chats, the other person's name. */
  title: string;
  coverUrl: string;
  /** For direct chats, the other person's user id. */
  peerId: string | null;
  members: MemberDto[];
  memberCount: number;
  lastMessage: LastMessageDto | null;
  unreadCount: number;
  createdAt: number;
  typingNames: string[];
  amOperator: boolean;
  isFrozen: boolean;
}

export type SendStatus = "pending" | "failed" | "sent";
export type ReceiptStatus = "sent" | "delivered" | "read";

export interface ReactionDto {
  key: string;
  count: number;
  mine: boolean;
}

export interface FileDto {
  url: string;
  name: string;
  size: number;
  mime: string;
  thumbnailUrl: string | null;
}

export interface ParentPreviewDto {
  messageId: number;
  senderName: string;
  preview: string;
}

export interface MessageDto {
  /** Stable key: messageId once sent, `p:<reqId>` while pending or failed. */
  key: string;
  messageId: number;
  reqId: string;
  channelUrl: string;
  kind: "user" | "file" | "admin";
  text: string;
  createdAt: number;
  edited: boolean;
  senderId: string | null;
  senderName: string;
  senderAvatar: string;
  isMine: boolean;
  status: SendStatus;
  parent: ParentPreviewDto | null;
  reactions: ReactionDto[];
  file: FileDto | null;
}

export interface EmojiDto {
  key: string;
  url: string;
}
