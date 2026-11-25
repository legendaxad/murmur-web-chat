import { DragEvent, useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { EmptyState, Spinner } from "../../../components/ui";
import { MAX_FILE_BYTES } from "../../../constants";
import { cx } from "../../../utils/format";
import { usePresence } from "../../users/usePresence";
import { useConversation } from "../hooks/useConversation";
import { composerTargetSet, selectChannelByUrl, selectConnection } from "../messagingSlice";
import {
  deleteMessage,
  discardFailed,
  loadPrevious,
  openConversation,
  resend,
  sendFile,
  toggleReaction,
} from "../sendbird/conversation";
import type { MessageDto } from "../types";
import { ChannelInfoPanel } from "./ChannelInfoPanel";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import type { BubbleActions } from "./MessageBubble";
import { MessageList } from "./MessageList";
import s from "./chat.module.css";

export function ChatPane({ channelUrl }: { channelUrl: string }) {
  const dispatch = useAppDispatch();
  const channel = useAppSelector((st) => selectChannelByUrl(st, channelUrl));
  const connection = useAppSelector(selectConnection);
  const convo = useConversation(channelUrl);
  const presence = usePresence(channel?.isDirect ? [channel.peerId] : []);
  const [infoOpen, setInfoOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const actions = useMemo<BubbleActions>(
    () => ({
      onReply: (m: MessageDto) => dispatch(composerTargetSet({ url: channelUrl, target: { mode: "reply", message: m } })),
      onEdit: (m: MessageDto) => dispatch(composerTargetSet({ url: channelUrl, target: { mode: "edit", message: m } })),
      onDelete: (m: MessageDto) => {
        if (!window.confirm("Delete this message for everyone?")) return;
        deleteMessage(channelUrl, m.key).catch((err: { code?: number }) =>
          toast.error(
            // Sendbird rule: a message that has replies can't be deleted.
            err?.code === 400920 ? "Messages that have replies can't be deleted." : "Couldn't delete the message.",
          ),
        );
      },
      onReact: (m: MessageDto, key: string) => {
        toggleReaction(channelUrl, m.key, key).catch(() => toast.error("Couldn't update the reaction."));
      },
      onResend: (m: MessageDto) => resend(channelUrl, m.key),
      onDiscard: (m: MessageDto) => void discardFailed(channelUrl, m.key),
    }),
    [dispatch, channelUrl],
  );

  const onLoadPrevious = useCallback(() => void loadPrevious(channelUrl), [channelUrl]);
  const onRetry = useCallback(() => void openConversation(channelUrl), [channelUrl]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    for (const file of Array.from(e.dataTransfer.files).slice(0, 10)) {
      if (file.size > MAX_FILE_BYTES) toast.error(`${file.name} is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
      else sendFile(channelUrl, file);
    }
  };

  if (!channel) {
    if (convo.status === "error") {
      return (
        <section className={s.pane}>
          <EmptyState icon="alert" title="Conversation not found" text="It may have been deleted, or you're no longer a member." />
        </section>
      );
    }
    return (
      <section className={s.pane}>
        <div className={s.listCenter}>
          <Spinner label={connection === "open" ? "Opening conversation" : "Connecting"} />
        </div>
      </section>
    );
  }

  const disabledReason = channel.isFrozen ? "This conversation is frozen." : undefined;

  return (
    <div className={cx(s.paneWrap, infoOpen && s.paneWithInfo)}>
      <section
        className={s.pane}
        aria-label={`Conversation with ${channel.title}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
        onDrop={onDrop}
      >
        <ChatHeader channel={channel} presence={channel.peerId ? presence[channel.peerId] : undefined} infoOpen={infoOpen} onToggleInfo={() => setInfoOpen((v) => !v)} />
        <MessageList
          messages={convo.messages}
          status={convo.status}
          hasPrevious={convo.hasPrevious}
          loadingPrevious={convo.loadingPrevious}
          receipts={convo.receipts}
          isGroup={!channel.isDirect}
          actions={actions}
          onLoadPrevious={onLoadPrevious}
          onRetry={onRetry}
        />
        <Composer channelUrl={channelUrl} disabled={disabledReason} />
        {dragging && <div className={s.dropOverlay}>Drop files to send</div>}
      </section>

      {infoOpen && <ChannelInfoPanel channel={channel} onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
