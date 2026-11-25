import {
  GroupChannel,
  MessageCollection,
  MessageCollectionInitPolicy,
  MessageFilter,
} from "@sendbird/chat/groupChannel";
import type { BaseMessage, FileMessage, UserMessage } from "@sendbird/chat/message";
import {
  channelsRemoved,
  channelsUpserted,
  conversationClosed,
  conversationFailed,
  conversationOpened,
  loadingPreviousChanged,
  messagesRemoved,
  messagesReplaced,
  messagesUpserted,
  receiptsUpdated,
} from "../messagingSlice";
import type { MessageDto, ReceiptStatus } from "../types";
import { getMessagingContext, getSendbird, setReceiptsListener } from "./connection";
import { messageKey, toChannelDto, toMessageDto } from "./mappers";

/**
 * The open conversation: one MessageCollection at a time. It keeps the
 * message list in sync, covering real-time events, edits, deletes, reactions
 * and gaps after a reconnect.
 * SDK message objects stay in `registry`. Redux gets DTOs.
 */

interface Active {
  url: string;
  channel: GroupChannel;
  collection: MessageCollection;
}

let active: Active | null = null;
let openGeneration = 0;
const registry = new Map<string, BaseMessage>();
/** Files and local previews for messages still sending, so they can be shown and resent. */
const pendingFiles = new Map<string, { file: File; previewUrl: string | null }>();

const dispatch = (action: Parameters<ReturnType<typeof getMessagingContext>["dispatch"]>[0]) =>
  getMessagingContext().dispatch(action);

const toDto = (m: BaseMessage): MessageDto => {
  const dto = toMessageDto(m, getMessagingContext().myId);
  // Show the local preview while a file message is still uploading.
  if (dto.file && !dto.file.url && dto.reqId) {
    const p = pendingFiles.get(dto.reqId);
    if (p?.previewUrl) dto.file = { ...dto.file, url: p.previewUrl };
  }
  return dto;
};

const track = (messages: BaseMessage[]) => {
  for (const m of messages) {
    const reqId = (m as { reqId?: string }).reqId;
    if (m.messageId > 0 && reqId) {
      registry.delete(`p:${reqId}`);
      const p = pendingFiles.get(reqId);
      if (p) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        pendingFiles.delete(reqId);
      }
    }
    registry.set(messageKey(m), m);
  }
};

const upsert = (url: string, messages: BaseMessage[]) => {
  if (messages.length === 0) return;
  const dtos = messages.map(toDto); // map before track() removes local previews
  track(messages);
  dispatch(messagesUpserted({ url, messages: dtos }));
};

const isActive = (url: string) => active?.url === url;

/* ---------- receipts ---------- */
function refreshReceipts(channel: GroupChannel) {
  if (!active || active.url !== channel.url) return;
  const myId = getMessagingContext().myId;
  const receipts: Record<string, ReceiptStatus> = {};
  const mine = [...registry.values()]
    .filter((m) => m.messageId > 0 && (m.isUserMessage() || m.isFileMessage()) && m.sender?.userId === myId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);

  for (const m of mine) {
    const key = messageKey(m);
    if (channel.getUnreadMemberCount(m) === 0) receipts[key] = "read";
    else if (channel.getUndeliveredMemberCount(m) === 0) receipts[key] = "delivered";
    else receipts[key] = "sent";
  }
  dispatch(receiptsUpdated({ url: channel.url, receipts }));
}

/* ---------- read state ---------- */
let lastMarkRead = 0;
export function markActiveAsRead() {
  if (!active || document.visibilityState !== "visible") return;
  const now = Date.now();
  if (now - lastMarkRead < 1000) return;
  lastMarkRead = now;
  active.channel.markAsRead().catch(() => undefined);
}

/* ---------- lifecycle ---------- */
export async function openConversation(url: string): Promise<void> {
  closeConversation();
  const gen = ++openGeneration;
  const { myId } = getMessagingContext();
  dispatch(conversationOpened(url));
  setReceiptsListener(refreshReceipts);

  try {
    const channel = await getSendbird().groupChannel.getChannel(url);
    if (gen !== openGeneration) return;
    dispatch(channelsUpserted([toChannelDto(channel, myId)]));

    const collection = channel.createMessageCollection({
      filter: new MessageFilter(),
      startingPoint: Date.now(),
      prevResultLimit: 40,
      nextResultLimit: 40,
    });
    active = { url, channel, collection };

    collection.setMessageCollectionHandler({
      onMessagesAdded: (_ctx, ch, messages) => {
        upsert(url, messages);
        refreshReceipts(ch);
        markActiveAsRead();
      },
      onMessagesUpdated: (_ctx, ch, messages) => {
        upsert(url, messages);
        refreshReceipts(ch);
      },
      onMessagesDeleted: (_ctx, _ch, _ids, messages) => {
        const keys = messages.map(messageKey);
        keys.forEach((k) => registry.delete(k));
        dispatch(messagesRemoved({ url, keys }));
      },
      onChannelUpdated: (_ctx, ch) => {
        dispatch(channelsUpserted([toChannelDto(ch, myId)]));
        refreshReceipts(ch);
      },
      onChannelDeleted: (_ctx, channelUrl) => {
        dispatch(channelsRemoved([channelUrl]));
        closeConversation();
      },
      // Too many messages were missed while offline: load the list again.
      onHugeGapDetected: () => {
        if (isActive(url)) void openConversation(url);
      },
    });

    collection
      .initialize(MessageCollectionInitPolicy.CACHE_AND_REPLACE_BY_API)
      .onCacheResult(() => undefined)
      .onApiResult((err, messages) => {
        if (gen !== openGeneration) return;
        if (err) {
          dispatch(conversationFailed(url));
          return;
        }
        const all = [...(messages ?? []), ...collection.pendingMessages, ...collection.failedMessages] as BaseMessage[];
        const dtos = all.map(toDto);
        track(all);
        dispatch(messagesReplaced({ url, messages: dtos, hasPrevious: collection.hasPrevious }));
        refreshReceipts(channel);
        markActiveAsRead();
      });
  } catch (err) {
    if (gen !== openGeneration) return;
    console.error("[messaging] open conversation failed", err);
    dispatch(conversationFailed(url));
  }
}

export function closeConversation() {
  openGeneration++;
  if (!active) return;
  const { url, collection } = active;
  collection.dispose();
  active = null;
  registry.clear();
  for (const p of pendingFiles.values()) if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
  pendingFiles.clear();
  try {
    dispatch(conversationClosed(url));
  } catch {
    /* messaging already stopped */
  }
}

export async function loadPrevious(url: string): Promise<void> {
  if (!active || active.url !== url || !active.collection.hasPrevious) return;
  const { collection } = active;
  dispatch(loadingPreviousChanged({ url, loading: true }));
  try {
    const older = await collection.loadPrevious();
    if (!isActive(url)) return;
    upsert(url, older);
    dispatch(loadingPreviousChanged({ url, loading: false, hasPrevious: collection.hasPrevious }));
  } catch {
    dispatch(loadingPreviousChanged({ url, loading: false }));
  }
}

/* ---------- actions ---------- */
const requireChannel = (url: string): GroupChannel => {
  if (!active || active.url !== url) throw new Error("Conversation is not open");
  return active.channel;
};

export function sendText(url: string, text: string, parentMessageId?: number) {
  const channel = requireChannel(url);
  channel
    .sendUserMessage({ message: text, ...(parentMessageId ? { parentMessageId } : {}) })
    .onPending((m) => upsert(url, [m]))
    .onFailed((_err, m) => m && upsert(url, [m]))
    .onSucceeded((m) => upsert(url, [m]));
}

export function sendFile(url: string, file: File, parentMessageId?: number) {
  const channel = requireChannel(url);
  const isImage = file.type.startsWith("image/");
  channel
    .sendFileMessage({
      file,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      ...(isImage ? { thumbnailSizes: [{ maxWidth: 480, maxHeight: 480 }] } : {}),
      ...(parentMessageId ? { parentMessageId } : {}),
    })
    .onPending((m) => {
      const previewUrl = isImage || file.type.startsWith("video/") ? URL.createObjectURL(file) : null;
      pendingFiles.set((m as FileMessage).reqId, { file, previewUrl });
      upsert(url, [m]);
    })
    .onFailed((_err, m) => m && upsert(url, [m]))
    .onSucceeded((m) => upsert(url, [m]));
}

export function resend(url: string, key: string) {
  const channel = requireChannel(url);
  const msg = registry.get(key);
  if (!msg) return;
  if (msg.isFileMessage()) {
    const file = pendingFiles.get(msg.reqId)?.file;
    channel
      .resendMessage(msg, file)
      .onPending((m) => upsert(url, [m]))
      .onFailed((_e, m) => m && upsert(url, [m]))
      .onSucceeded((m) => upsert(url, [m]));
  } else if (msg.isUserMessage()) {
    channel
      .resendMessage(msg as UserMessage)
      .onPending((m) => upsert(url, [m]))
      .onFailed((_e, m) => m && upsert(url, [m]))
      .onSucceeded((m) => upsert(url, [m]));
  }
}

export async function discardFailed(url: string, key: string) {
  const msg = registry.get(key);
  if (!active || !msg) return;
  const reqId = (msg as UserMessage).reqId;
  await active.collection.removeFailedMessage(reqId).catch(() => undefined);
  registry.delete(key);
  dispatch(messagesRemoved({ url, keys: [key] }));
}

export async function editMessage(url: string, key: string, text: string) {
  const channel = requireChannel(url);
  const msg = registry.get(key);
  if (!msg?.isUserMessage()) return;
  const updated = await channel.updateUserMessage(msg.messageId, { message: text });
  upsert(url, [updated]);
}

export async function deleteMessage(url: string, key: string) {
  const channel = requireChannel(url);
  const msg = registry.get(key);
  if (!msg) return;
  await channel.deleteMessage(msg);
  registry.delete(key);
  dispatch(messagesRemoved({ url, keys: [key] }));
}

export async function toggleReaction(url: string, key: string, emojiKey: string) {
  const channel = requireChannel(url);
  const msg = registry.get(key);
  if (!msg || msg.messageId <= 0) return;
  const reacted = msg.reactions?.find((r) => r.key === emojiKey)?.hasCurrentUserReacted;
  const event = reacted ? await channel.deleteReaction(msg, emojiKey) : await channel.addReaction(msg, emojiKey);
  msg.applyReactionEvent(event);
  upsert(url, [msg]);
}

export function setTyping(url: string, typing: boolean) {
  if (!isActive(url)) return;
  const channel = active!.channel;
  (typing ? channel.startTyping() : channel.endTyping()).catch(() => undefined);
}

export async function leaveConversation(url: string) {
  const channel = await getSendbird().groupChannel.getChannel(url);
  await channel.leave();
  if (isActive(url)) closeConversation();
  dispatch(channelsRemoved([url]));
}
