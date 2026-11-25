import { memo, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import { SearchInput } from "../../../components/common/SearchInput";
import { Avatar, Badge, Banner, Button, EmptyState, IconButton, Skeleton } from "../../../components/ui";
import type { Presence } from "../../../types/api";
import { cx, formatListTimestamp } from "../../../utils/format";
import { usePresence } from "../../users/usePresence";
import {
  selectAllChannels,
  selectChannelsStatus,
  selectConnection,
  selectConnectionError,
  selectHasMoreChannels,
  selectPeerIds,
} from "../messagingSlice";
import { loadMoreChannels, retryMessaging } from "../sendbird/connection";
import type { ChannelDto } from "../types";
import s from "./chat.module.css";

const ChannelItem = memo(function ChannelItem({ channel, presence }: { channel: ChannelDto; presence?: Presence }) {
  const last = channel.lastMessage;
  const typing = channel.typingNames.length > 0;
  const preview = typing
    ? channel.isDirect
      ? "typing…"
      : `${channel.typingNames[0]} is typing…`
    : last
      ? `${last.isMine ? "You: " : !channel.isDirect && last.senderName ? `${last.senderName}: ` : ""}${last.preview}`
      : "No messages yet";

  return (
    <NavLink
      to={`/chat/${encodeURIComponent(channel.url)}`}
      className={({ isActive }) => cx(s.channel, isActive && s.channelActive)}
    >
      <Avatar name={channel.title} src={channel.coverUrl} seed={channel.peerId ?? channel.url} size={48} online={presence?.online} />
      <span className={s.channelBody}>
        <span className={s.channelTop}>
          <span className={s.channelTitle}>{channel.title}</span>
          <span className={cx(s.channelTime, channel.unreadCount > 0 && s.channelTimeUnread)}>
            {formatListTimestamp(last?.createdAt ?? channel.createdAt)}
          </span>
        </span>
        <span className={s.channelBottom}>
          <span className={cx(s.channelPreview, typing && s.channelPreviewTyping)}>{preview}</span>
          <Badge count={channel.unreadCount} />
        </span>
      </span>
    </NavLink>
  );
});

export function ChannelList({ onNewChat }: { onNewChat: () => void }) {
  const channels = useAppSelector(selectAllChannels);
  const status = useAppSelector(selectChannelsStatus);
  const connection = useAppSelector(selectConnection);
  const connectionError = useAppSelector(selectConnectionError);
  const hasMore = useAppSelector(selectHasMoreChannels);
  const peerIds = useAppSelector(selectPeerIds);
  const presence = usePresence(peerIds);
  const [query, setQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? channels.filter((c) => c.title.toLowerCase().includes(q)) : channels;
  }, [channels, query]);

  return (
    <aside className={s.sidebar}>
      <header className={s.sidebarHeader}>
        <h1>Chats</h1>
        <IconButton icon="plus" label="New conversation" onClick={onNewChat} active />
      </header>

      {connection === "reconnecting" && <Banner tone="warning">Reconnecting…</Banner>}
      {(connection === "error" || connection === "closed") && (
        <Banner
          tone="error"
          action={
            <Button size="sm" variant="ghost" onClick={() => void retryMessaging()}>
              Retry
            </Button>
          }
        >
          {connectionError ?? "You're offline."}
        </Banner>
      )}

      <div className={s.sidebarSearch}>
        <SearchInput label="Search chats" placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <nav className={s.channelList} aria-label="Conversations">
        {(status === "idle" || status === "loading") &&
          Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={s.channel}>
              <Skeleton width={48} height={48} radius={24} />
              <span className={s.channelBody} style={{ gap: 8 }}>
                <Skeleton width="55%" height={12} />
                <Skeleton width="80%" height={10} />
              </span>
            </div>
          ))}

        {status === "error" && (
          <EmptyState
            icon="alert"
            title="Couldn't load chats"
            action={<Button variant="secondary" size="sm" onClick={() => void retryMessaging()}>Try again</Button>}
          />
        )}

        {status === "ready" && channels.length === 0 && (
          <EmptyState
            icon="chat"
            title="No conversations yet"
            text="Start a chat with a contact, or find people by username."
            action={<Button icon="plus" onClick={onNewChat}>New conversation</Button>}
          />
        )}

        {status === "ready" && channels.length > 0 && filtered.length === 0 && (
          <p className={s.noResults}>No chats match “{query}”.</p>
        )}

        {filtered.map((c) => (
          <ChannelItem key={c.url} channel={c} presence={c.peerId ? presence[c.peerId] : undefined} />
        ))}

        {hasMore && !query && (
          <div className={s.loadMore}>
            <Button
              variant="ghost"
              size="sm"
              loading={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                await loadMoreChannels().finally(() => setLoadingMore(false));
              }}
            >
              Load more
            </Button>
          </div>
        )}
      </nav>
    </aside>
  );
}
