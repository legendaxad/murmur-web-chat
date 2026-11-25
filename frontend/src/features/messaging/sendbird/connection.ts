import SendbirdChat, { ConnectionHandler, SessionHandler, UserEventHandler } from "@sendbird/chat";
import {
  GroupChannel,
  GroupChannelCollection,
  GroupChannelFilter,
  GroupChannelHandler,
  GroupChannelListOrder,
  GroupChannelModule,
  type SendbirdGroupChat,
} from "@sendbird/chat/groupChannel";
import type { Dispatch } from "@reduxjs/toolkit";
import type { SendbirdSession } from "../../../types/api";
import {
  channelsFailed,
  channelsLoaded,
  channelsLoading,
  channelsRemoved,
  channelsUpserted,
  connectionChanged,
  emojisLoaded,
  messagingReset,
  totalUnreadChanged,
} from "../messagingSlice";
import { toChannelDto } from "./mappers";

/**
 * Owns the single Sendbird SDK instance: connecting, reconnecting, renewing
 * the session token, the channel list, and app-wide event handlers.
 * Everything it learns is sent to Redux as plain data.
 */

const HANDLER_KEY = "app-connection";

export interface MessagingContext {
  dispatch: Dispatch;
  myId: string;
  /** Asks our backend for a new Sendbird session token. */
  fetchSession: () => Promise<SendbirdSession>;
  /** Called by the channel handler when read or delivery receipts change. */
  onReceiptsChanged?: (channel: GroupChannel) => void;
}

let sb: SendbirdGroupChat | null = null;
let ctx: MessagingContext | null = null;
let channelCollection: GroupChannelCollection | null = null;
/** Increases with every start/stop, so a slower earlier start can tell it's out of date (React StrictMode, fast logout). */
let generation = 0;

export const getSendbird = (): SendbirdGroupChat => {
  if (!sb) throw new Error("Chat is not connected");
  return sb;
};
export const getMessagingContext = (): MessagingContext => {
  if (!ctx) throw new Error("Chat is not connected");
  return ctx;
};

export const setReceiptsListener = (fn: (channel: GroupChannel) => void) => {
  if (ctx) ctx.onReceiptsChanged = fn;
};

const upsertChannels = (channels: GroupChannel[]) => {
  if (!ctx || channels.length === 0) return;
  ctx.dispatch(channelsUpserted(channels.map((c) => toChannelDto(c, ctx!.myId))));
};

export async function startMessaging(context: MessagingContext): Promise<void> {
  await stopMessaging();
  const gen = ++generation;
  ctx = context;
  const { dispatch } = context;
  dispatch(connectionChanged({ status: "connecting" }));

  try {
    const session = await context.fetchSession();
    if (gen !== generation) return;

    const instance = SendbirdChat.init({
      appId: session.appId,
      modules: [new GroupChannelModule()],
      localCacheEnabled: false,
      newInstance: true,
    }) as SendbirdGroupChat;
    sb = instance;

    instance.setSessionHandler(
      new SessionHandler({
        // Sendbird asks for a new token before the current one expires.
        onSessionTokenRequired: (resolve, reject) => {
          context
            .fetchSession()
            .then((s) => resolve(s.token))
            .catch((err) => reject(err));
        },
        onSessionClosed: () => dispatch(connectionChanged({ status: "closed", error: "Your chat session ended." })),
        onSessionError: () => dispatch(connectionChanged({ status: "error", error: "Couldn't renew your chat session." })),
      }),
    );

    instance.addConnectionHandler(
      HANDLER_KEY,
      new ConnectionHandler({
        onReconnectStarted: () => dispatch(connectionChanged({ status: "reconnecting" })),
        onReconnectSucceeded: () => {
          dispatch(connectionChanged({ status: "open" }));
          refreshTotalUnread();
        },
        onReconnectFailed: () =>
          dispatch(connectionChanged({ status: "closed", error: "Connection lost. Trying again when you're back online." })),
        onDisconnected: () => dispatch(connectionChanged({ status: "closed" })),
      }),
    );

    instance.addUserEventHandler(
      HANDLER_KEY,
      new UserEventHandler({
        onTotalUnreadMessageCountChanged: (count) => dispatch(totalUnreadChanged(count.groupChannelCount)),
      }),
    );

    instance.groupChannel.addGroupChannelHandler(
      HANDLER_KEY,
      new GroupChannelHandler({
        onTypingStatusUpdated: (channel) => upsertChannels([channel]),
        onUserMarkedRead: (channel) => ctx?.onReceiptsChanged?.(channel),
        onUndeliveredMemberStatusUpdated: (channel) => ctx?.onReceiptsChanged?.(channel),
      }),
    );

    await instance.connect(session.userId, session.token);
    if (gen !== generation) {
      await instance.disconnect().catch(() => undefined);
      return;
    }
    dispatch(connectionChanged({ status: "open" }));

    refreshTotalUnread();
    void loadEmojis(gen);
    await loadChannels(gen);
  } catch (err) {
    if (gen !== generation) return;
    console.error("[messaging] connect failed", err);
    dispatch(connectionChanged({ status: "error", error: "Couldn't connect to chat. Please try again." }));
  }
}

export async function stopMessaging(): Promise<void> {
  generation++;
  const instance = sb;
  sb = null;
  channelCollection?.dispose();
  channelCollection = null;
  if (instance) {
    instance.removeConnectionHandler(HANDLER_KEY);
    instance.removeUserEventHandler(HANDLER_KEY);
    instance.groupChannel.removeGroupChannelHandler(HANDLER_KEY);
    await instance.disconnect().catch(() => undefined);
  }
  ctx?.dispatch(messagingReset());
  ctx = null;
}

/** Restarts after an error, using the same context. */
export async function retryMessaging(): Promise<void> {
  if (ctx) await startMessaging(ctx);
}

async function loadChannels(gen: number) {
  if (!sb || !ctx) return;
  const { dispatch, myId } = ctx;
  dispatch(channelsLoading());

  const filter = new GroupChannelFilter();
  filter.includeEmpty = true; // show newly created chats before their first message

  const collection = sb.groupChannel.createGroupChannelCollection({
    filter,
    order: GroupChannelListOrder.LATEST_LAST_MESSAGE,
    limit: 30,
  });
  channelCollection = collection;

  collection.setGroupChannelCollectionHandler({
    onChannelsAdded: (_c, channels) => upsertChannels(channels as GroupChannel[]),
    onChannelsUpdated: (_c, channels) => upsertChannels(channels as GroupChannel[]),
    onChannelsDeleted: (_c, urls) => dispatch(channelsRemoved(urls)),
  });

  try {
    const channels = await collection.loadMore();
    if (gen !== generation) return;
    dispatch(channelsLoaded({ channels: channels.map((c) => toChannelDto(c, myId)), hasMore: collection.hasMore }));
  } catch (err) {
    if (gen !== generation) return;
    console.error("[messaging] channel list failed", err);
    dispatch(channelsFailed());
  }
}

export async function loadMoreChannels(): Promise<void> {
  if (!channelCollection || !ctx || !channelCollection.hasMore) return;
  const channels = await channelCollection.loadMore();
  ctx.dispatch(
    channelsLoaded({ channels: channels.map((c) => toChannelDto(c, ctx!.myId)), hasMore: channelCollection.hasMore }),
  );
}

function refreshTotalUnread() {
  sb?.groupChannel
    .getTotalUnreadMessageCount()
    .then((n) => ctx?.dispatch(totalUnreadChanged(n)))
    .catch(() => undefined);
}

/** Reactions use the app's emoji set (configured in the Sendbird dashboard). */
async function loadEmojis(gen: number) {
  try {
    const container = await getSendbird().getAllEmoji();
    if (gen !== generation) return;
    const emojis = container.emojiCategories.flatMap((cat) => cat.emojis.map((e) => ({ key: e.key, url: e.url })));
    ctx?.dispatch(emojisLoaded(emojis));
  } catch {
    // Reactions are off for this app or plan: the UI hides the reaction picker.
    ctx?.dispatch(emojisLoaded([]));
  }
}
