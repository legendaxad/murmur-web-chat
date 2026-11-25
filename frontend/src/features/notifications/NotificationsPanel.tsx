import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, EmptyState, IconButton, Skeleton } from "../../components/ui";
import type { AppNotification } from "../../types/api";
import { cx, formatListTimestamp } from "../../utils/format";
import { useAcceptRequestMutation } from "../contacts/contactsApi";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "./notificationsApi";
import s from "./notifications.module.css";

const describe = (n: AppNotification) => {
  const who = n.actor?.displayName ?? "Someone";
  switch (n.type) {
    case "contact_request":
      return { text: <><b>{who}</b> wants to add you as a contact</>, to: "/contacts" };
    case "contact_accepted":
      return { text: <><b>{who}</b> accepted your contact request</>, to: "/contacts" };
    case "group_added":
      return {
        text: <><b>{who}</b> added you to <b>{n.data.channelName || "a group"}</b></>,
        to: n.data.channelUrl ? `/chat/${encodeURIComponent(n.data.channelUrl)}` : "/chat",
      };
    default:
      return { text: <>New activity</>, to: "/chat" };
  }
};

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const [accept, { isLoading: accepting }] = useAcceptRequestMutation();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = (n: AppNotification) => {
    if (!n.readAt) void markRead(n.id);
    navigate(describe(n).to);
    onClose();
  };

  const hasUnread = data?.some((n) => !n.readAt);

  return (
    <>
      <div className={s.scrim} onClick={onClose} />
      <aside className={s.panel} aria-label="Notifications">
        <header className={s.header}>
          <h2>Notifications</h2>
          <div className={s.headerActions}>
            {hasUnread && (
              <Button variant="ghost" size="sm" onClick={() => markAll()} loading={markingAll}>
                Mark all read
              </Button>
            )}
            <IconButton icon="x" label="Close notifications" onClick={onClose} />
          </div>
        </header>

        <div className={s.list}>
          {isLoading &&
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={s.item}>
                <Skeleton width={40} height={40} radius={20} />
                <div style={{ flex: 1, display: "grid", gap: 6 }}>
                  <Skeleton width="80%" height={12} />
                  <Skeleton width="30%" height={10} />
                </div>
              </div>
            ))}

          {isError && (
            <EmptyState
              icon="alert"
              title="Couldn't load notifications"
              action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>}
            />
          )}

          {data?.length === 0 && (
            <EmptyState icon="bell" title="You're all caught up" text="Contact requests and group invites will show up here." />
          )}

          {data?.map((n) => (
            <div key={n.id} className={cx(s.item, !n.readAt && s.unread)}>
              <button className={s.itemMain} onClick={() => open(n)}>
                <Avatar name={n.actor?.displayName ?? "?"} src={n.actor?.avatarUrl} seed={n.actor?.id} size={40} />
                <span className={s.itemText}>
                  <span>{describe(n).text}</span>
                  <span className={s.time}>{formatListTimestamp(new Date(n.createdAt).getTime())}</span>
                </span>
              </button>
              {n.type === "contact_request" && n.data.friendshipId && !n.readAt && (
                <Button
                  size="sm"
                  variant="soft"
                  loading={accepting}
                  onClick={async () => {
                    await accept(n.data.friendshipId!);
                    void markRead(n.id);
                  }}
                >
                  Accept
                </Button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
