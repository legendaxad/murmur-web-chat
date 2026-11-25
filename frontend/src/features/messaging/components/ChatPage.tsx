import { useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState, Button } from "../../../components/ui";
import { cx } from "../../../utils/format";
import { NewChatModal } from "../../conversations/NewChatModal";
import { ChannelList } from "./ChannelList";
import { ChatPane } from "./ChatPane";
import s from "./chat.module.css";

/**
 * Two-pane layout: conversations on the left, the open conversation on the right.
 * On mobile only one pane shows at a time, chosen by the URL.
 */
export default function ChatPage() {
  const { channelUrl } = useParams();
  const url = channelUrl ? decodeURIComponent(channelUrl) : undefined;
  const [newChatOpen, setNewChatOpen] = useState(false);

  return (
    <div className={cx(s.chatPage, url && s.chatPageOpen)}>
      <ChannelList onNewChat={() => setNewChatOpen(true)} />
      {url ? (
        <ChatPane key={url} channelUrl={url} />
      ) : (
        <section className={cx(s.pane, s.paneEmpty)}>
          <EmptyState
            icon="chat"
            title="Pick a conversation"
            text="Choose a chat on the left, or start a new one."
            action={<Button icon="plus" onClick={() => setNewChatOpen(true)}>New conversation</Button>}
          />
        </section>
      )}
      {newChatOpen && <NewChatModal onClose={() => setNewChatOpen(false)} />}
    </div>
  );
}
