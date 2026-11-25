import { Link } from "react-router-dom";
import { Avatar, Icon, IconButton } from "../../../components/ui";
import type { Presence } from "../../../types/api";
import { formatLastSeen } from "../../../utils/format";
import type { ChannelDto } from "../types";
import s from "./chat.module.css";

interface Props {
  channel: ChannelDto;
  presence?: Presence;
  infoOpen: boolean;
  onToggleInfo: () => void;
}

export function ChatHeader({ channel, presence, infoOpen, onToggleInfo }: Props) {
  const typing = channel.typingNames;
  let subtitle: string;
  if (typing.length) {
    subtitle = channel.isDirect ? "typing…" : `${typing.slice(0, 2).join(", ")} ${typing.length > 1 ? "are" : "is"} typing…`;
  } else if (channel.isDirect) {
    subtitle = presence?.online ? "online" : formatLastSeen(presence?.lastSeenAt);
  } else {
    subtitle = `${channel.memberCount} member${channel.memberCount === 1 ? "" : "s"}`;
  }

  return (
    <header className={s.header}>
      <Link to="/chat" className={s.backLink} aria-label="Back to chats" title="Back to chats">
        <Icon name="arrowLeft" size={20} />
      </Link>
      <button type="button" className={s.headerMain} onClick={onToggleInfo} aria-expanded={infoOpen}>
        <Avatar name={channel.title} src={channel.coverUrl} seed={channel.peerId ?? channel.url} size={40} online={channel.isDirect && presence?.online} />
        <span className={s.headerText}>
          <span className={s.headerTitle}>{channel.title}</span>
          <span className={typing.length ? s.headerTyping : presence?.online ? s.headerOnline : s.headerSub}>{subtitle}</span>
        </span>
      </button>
      <IconButton icon="info" label="Conversation details" active={infoOpen} onClick={onToggleInfo} />
    </header>
  );
}
