import { useState } from "react";
import { NavLink, Outlet, useMatch } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { APP_NAME, NOTIFICATIONS_POLL_MS } from "../../constants";
import { selectCurrentUser } from "../../features/auth/authSlice";
import { useGetRequestsQuery } from "../../features/contacts/contactsApi";
import { useMessagingConnection } from "../../features/messaging/hooks/useMessagingConnection";
import { selectTotalUnread } from "../../features/messaging/messagingSlice";
import { NotificationsPanel } from "../../features/notifications/NotificationsPanel";
import { useGetUnreadNotificationCountQuery } from "../../features/notifications/notificationsApi";
import { cx } from "../../utils/format";
import { Avatar, Icon, IconButton, IconName } from "../ui";
import s from "./layout.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  badge?: number;
}

/** Authenticated layout: nav rail on desktop, bottom tab bar on mobile. */
export function AppShell() {
  useMessagingConnection();

  const me = useAppSelector(selectCurrentUser);
  const totalUnread = useAppSelector(selectTotalUnread);
  const { data: requests } = useGetRequestsQuery(undefined, { pollingInterval: NOTIFICATIONS_POLL_MS, skipPollingIfUnfocused: true });
  const { data: unreadNotifications = 0 } = useGetUnreadNotificationCountQuery(undefined, {
    pollingInterval: NOTIFICATIONS_POLL_MS,
    skipPollingIfUnfocused: true,
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const inConversation = Boolean(useMatch("/chat/:channelUrl"));

  const incoming = requests?.filter((r) => r.direction === "incoming").length ?? 0;
  const items: NavItem[] = [
    { to: "/chat", label: "Chats", icon: "chat", badge: totalUnread },
    { to: "/contacts", label: "Contacts", icon: "users", badge: incoming },
    { to: "/profile", label: "Profile", icon: "user" },
  ];

  return (
    <div className={cx(s.shell, inConversation && s.inConversation)}>
      <nav className={s.rail} aria-label="Main">
        <div className={s.railLogo} title={APP_NAME} aria-hidden="true">
          <span />
        </div>
        <div className={s.railItems}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cx(s.railItem, isActive && s.railItemActive)}>
              <span className={s.railIcon}>
                <Icon name={item.icon} size={22} />
                {item.badge ? <span className={s.railBadge}>{item.badge > 99 ? "99+" : item.badge}</span> : null}
              </span>
              <span className={s.railLabel}>{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div className={s.railBottom}>
          <IconButton
            icon="bell"
            label="Notifications"
            badge={unreadNotifications}
            active={showNotifications}
            onClick={() => setShowNotifications((v) => !v)}
          />
          {me && (
            <NavLink to="/profile" className={s.railMe} aria-label="Your profile">
              <Avatar name={me.displayName} src={me.avatarUrl} seed={me.id} size={36} />
            </NavLink>
          )}
        </div>
      </nav>

      <main className={s.main}>
        <Outlet />
      </main>

      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}
