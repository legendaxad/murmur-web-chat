import { createEntityAdapter, createSelector, createSlice, EntityState, PayloadAction } from "@reduxjs/toolkit";
import type { ChannelDto, ConnectionStatus, EmojiDto, MessageDto, ReceiptStatus } from "./types";

/**
 * Messaging state layer.
 * - Sendbird owns the data; this slice holds a serializable copy kept up to
 *   date by SDK event handlers (see sendbird/connection.ts and sendbird/conversation.ts).
 * - Components read only from here. They never touch SDK objects.
 */

const channelsAdapter = createEntityAdapter<ChannelDto, string>({
  selectId: (c) => c.url,
  sortComparer: (a, b) => (b.lastMessage?.createdAt ?? b.createdAt) - (a.lastMessage?.createdAt ?? a.createdAt),
});

const messagesAdapter = createEntityAdapter<MessageDto, string>({
  selectId: (m) => m.key,
  sortComparer: (a, b) => a.createdAt - b.createdAt || a.key.localeCompare(b.key),
});

export interface ConversationState {
  messages: EntityState<MessageDto, string>;
  status: "loading" | "ready" | "error";
  hasPrevious: boolean;
  loadingPrevious: boolean;
  receipts: Record<string, ReceiptStatus>;
}

export interface ComposerTarget {
  mode: "reply" | "edit";
  message: MessageDto;
}

interface MessagingState {
  connection: ConnectionStatus;
  connectionError: string | null;
  channels: EntityState<ChannelDto, string>;
  channelsStatus: "idle" | "loading" | "ready" | "error";
  hasMoreChannels: boolean;
  totalUnread: number;
  emojis: EmojiDto[];
  conversations: Record<string, ConversationState>;
  composer: Record<string, ComposerTarget | null>;
}

const initialState: MessagingState = {
  connection: "idle",
  connectionError: null,
  channels: channelsAdapter.getInitialState(),
  channelsStatus: "idle",
  hasMoreChannels: false,
  totalUnread: 0,
  emojis: [],
  conversations: {},
  composer: {},
};

const emptyConversation = (): ConversationState => ({
  messages: messagesAdapter.getInitialState(),
  status: "loading",
  hasPrevious: false,
  loadingPrevious: false,
  receipts: {},
});

const convo = (state: MessagingState, url: string) => (state.conversations[url] ??= emptyConversation());

const slice = createSlice({
  name: "messaging",
  initialState,
  reducers: {
    connectionChanged(state, action: PayloadAction<{ status: ConnectionStatus; error?: string | null }>) {
      state.connection = action.payload.status;
      state.connectionError = action.payload.error ?? null;
    },
    channelsLoading(state) {
      state.channelsStatus = "loading";
    },
    channelsLoaded(state, action: PayloadAction<{ channels: ChannelDto[]; hasMore: boolean }>) {
      channelsAdapter.upsertMany(state.channels, action.payload.channels);
      state.channelsStatus = "ready";
      state.hasMoreChannels = action.payload.hasMore;
    },
    channelsFailed(state) {
      state.channelsStatus = "error";
    },
    channelsUpserted(state, action: PayloadAction<ChannelDto[]>) {
      channelsAdapter.setMany(state.channels, action.payload);
    },
    channelsRemoved(state, action: PayloadAction<string[]>) {
      channelsAdapter.removeMany(state.channels, action.payload);
      for (const url of action.payload) {
        delete state.conversations[url];
        delete state.composer[url];
      }
    },
    totalUnreadChanged(state, action: PayloadAction<number>) {
      state.totalUnread = action.payload;
    },
    emojisLoaded(state, action: PayloadAction<EmojiDto[]>) {
      state.emojis = action.payload;
    },

    conversationOpened(state, action: PayloadAction<string>) {
      state.conversations[action.payload] = emptyConversation();
    },
    conversationClosed(state, action: PayloadAction<string>) {
      delete state.conversations[action.payload];
    },
    conversationFailed(state, action: PayloadAction<string>) {
      convo(state, action.payload).status = "error";
    },
    messagesReplaced(state, action: PayloadAction<{ url: string; messages: MessageDto[]; hasPrevious: boolean }>) {
      const c = convo(state, action.payload.url);
      messagesAdapter.setAll(c.messages, action.payload.messages);
      c.status = "ready";
      c.hasPrevious = action.payload.hasPrevious;
    },
    /** Adds/updates messages; a sent message replaces its pending copy (same reqId). */
    messagesUpserted(state, action: PayloadAction<{ url: string; messages: MessageDto[] }>) {
      const c = convo(state, action.payload.url);
      for (const m of action.payload.messages) {
        if (m.messageId > 0 && m.reqId) messagesAdapter.removeOne(c.messages, `p:${m.reqId}`);
      }
      messagesAdapter.setMany(c.messages, action.payload.messages);
    },
    messagesRemoved(state, action: PayloadAction<{ url: string; keys: string[] }>) {
      const c = state.conversations[action.payload.url];
      if (c) messagesAdapter.removeMany(c.messages, action.payload.keys);
    },
    loadingPreviousChanged(state, action: PayloadAction<{ url: string; loading: boolean; hasPrevious?: boolean }>) {
      const c = convo(state, action.payload.url);
      c.loadingPrevious = action.payload.loading;
      if (action.payload.hasPrevious !== undefined) c.hasPrevious = action.payload.hasPrevious;
    },
    receiptsUpdated(state, action: PayloadAction<{ url: string; receipts: Record<string, ReceiptStatus> }>) {
      const c = state.conversations[action.payload.url];
      if (c) c.receipts = action.payload.receipts;
    },
    composerTargetSet(state, action: PayloadAction<{ url: string; target: ComposerTarget | null }>) {
      state.composer[action.payload.url] = action.payload.target;
    },
    messagingReset() {
      return initialState;
    },
  },
});

export const {
  connectionChanged,
  channelsLoading,
  channelsLoaded,
  channelsFailed,
  channelsUpserted,
  channelsRemoved,
  totalUnreadChanged,
  emojisLoaded,
  conversationOpened,
  conversationClosed,
  conversationFailed,
  messagesReplaced,
  messagesUpserted,
  messagesRemoved,
  loadingPreviousChanged,
  receiptsUpdated,
  composerTargetSet,
  messagingReset,
} = slice.actions;

export default slice.reducer;

/* ---------- selectors ---------- */
type Root = { messaging: MessagingState };

const channelSelectors = channelsAdapter.getSelectors((s: Root) => s.messaging.channels);
export const selectAllChannels = channelSelectors.selectAll;
export const selectChannelByUrl = (s: Root, url: string | undefined) =>
  url ? channelSelectors.selectById(s, url) : undefined;

export const selectConnection = (s: Root) => s.messaging.connection;
export const selectConnectionError = (s: Root) => s.messaging.connectionError;
export const selectChannelsStatus = (s: Root) => s.messaging.channelsStatus;
export const selectHasMoreChannels = (s: Root) => s.messaging.hasMoreChannels;
export const selectTotalUnread = (s: Root) => s.messaging.totalUnread;
export const selectEmojis = (s: Root) => s.messaging.emojis;
export const selectConversation = (s: Root, url: string) => s.messaging.conversations[url];
export const selectComposerTarget = (s: Root, url: string) => s.messaging.composer[url] ?? null;

const messageSelectors = messagesAdapter.getSelectors();
const EMPTY: MessageDto[] = [];
export const makeSelectMessages = () =>
  createSelector([(s: Root, url: string) => s.messaging.conversations[url]?.messages], (m) =>
    m ? messageSelectors.selectAll(m) : EMPTY,
  );

/** User ids of every direct-chat peer: used for presence polling. */
export const selectPeerIds = createSelector([selectAllChannels], (channels) =>
  [...new Set(channels.map((c) => c.peerId).filter((id): id is string => Boolean(id)))].sort(),
);
