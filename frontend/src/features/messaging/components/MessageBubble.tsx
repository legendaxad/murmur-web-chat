import { memo, useRef, useState } from "react";
import { Avatar, Icon, IconButton } from "../../../components/ui";
import { cx, formatBytes, formatTime } from "../../../utils/format";
import type { EmojiDto, MessageDto, ReceiptStatus } from "../types";
import { ReactionPicker } from "./ReactionPicker";
import s from "./chat.module.css";

export interface BubbleActions {
  onReply: (m: MessageDto) => void;
  onEdit: (m: MessageDto) => void;
  onDelete: (m: MessageDto) => void;
  onReact: (m: MessageDto, emojiKey: string) => void;
  onResend: (m: MessageDto) => void;
  onDiscard: (m: MessageDto) => void;
  onJumpToParent?: (messageId: number) => void;
}

interface Props {
  message: MessageDto;
  /** First message of a run from the same sender: shows name and avatar. */
  showHeader: boolean;
  showAvatar: boolean;
  isGroup: boolean;
  receipt?: ReceiptStatus;
  emojis: EmojiDto[];
  actions: BubbleActions;
}

const ReceiptIcon = ({ status, sendStatus }: { status?: ReceiptStatus; sendStatus: MessageDto["status"] }) => {
  if (sendStatus === "pending") return <Icon name="clock" size={14} aria-label="Sending" />;
  if (sendStatus === "failed") return null;
  if (status === "read") return <Icon name="checks" size={16} className={s.read} aria-label="Read" />;
  if (status === "delivered") return <Icon name="checks" size={16} aria-label="Delivered" />;
  return <Icon name="check" size={16} aria-label="Sent" />;
};

function FileContent({ file, pending }: { file: NonNullable<MessageDto["file"]>; pending: boolean }) {
  if (file.mime.startsWith("image/") && file.url) {
    return (
      <a href={file.url} target="_blank" rel="noreferrer noopener" className={s.media}>
        <img src={file.thumbnailUrl || file.url} alt={file.name} loading="lazy" />
        {pending && <span className={s.mediaUploading}>Uploading…</span>}
      </a>
    );
  }
  if (file.mime.startsWith("video/") && file.url) {
    return <video className={s.media} src={file.url} controls preload="metadata" />;
  }
  if (file.mime.startsWith("audio/") && file.url) {
    return <audio className={s.audio} src={file.url} controls preload="metadata" />;
  }
  return (
    <a href={file.url || undefined} target="_blank" rel="noreferrer noopener" className={s.fileCard} download={file.name}>
      <span className={s.fileIcon}>
        <Icon name="file" size={20} />
      </span>
      <span className={s.fileMeta}>
        <span className={s.fileName}>{file.name}</span>
        <span className={s.fileSize}>{pending ? "Uploading…" : formatBytes(file.size)}</span>
      </span>
      {!pending && <Icon name="download" size={18} />}
    </a>
  );
}

function MessageBubbleImpl({ message: m, showHeader, showAvatar, isGroup, receipt, emojis, actions }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactButton = useRef<HTMLButtonElement>(null);

  if (m.kind === "admin") {
    return <div className={s.systemMessage}>{m.text}</div>;
  }

  const failed = m.status === "failed";
  const emojiUrl = (key: string) => emojis.find((e) => e.key === key)?.url;
  const canAct = m.status === "sent";

  return (
    <div
      className={cx(s.row, m.isMine ? s.rowOut : s.rowIn, showHeader && s.rowFirst)}
      data-message-id={m.messageId || undefined}
    >
      {!m.isMine && isGroup && (
        <div className={s.rowAvatar}>
          {showAvatar && <Avatar name={m.senderName} src={m.senderAvatar} seed={m.senderId ?? ""} size={32} />}
        </div>
      )}

      <div className={s.bubbleColumn}>
        {showHeader && !m.isMine && isGroup && <div className={s.senderName}>{m.senderName}</div>}

        <div className={s.bubbleLine}>
          <div
            className={cx(
              s.bubble,
              m.isMine ? s.bubbleOut : s.bubbleIn,
              m.file && !m.text && (m.file.mime.startsWith("image/") || m.file.mime.startsWith("video/")) && s.bubbleMedia,
              failed && s.bubbleFailed,
            )}
          >
            {m.parent && (
              <button type="button" className={s.quote} onClick={() => actions.onJumpToParent?.(m.parent!.messageId)}>
                <span className={s.quoteName}>{m.parent.senderName || "Reply"}</span>
                <span className={s.quoteText}>{m.parent.preview}</span>
              </button>
            )}

            {m.file && <FileContent file={m.file} pending={m.status === "pending"} />}
            {m.text && <span className={s.text}>{m.text}</span>}

            <span className={s.meta}>
              {m.edited && <span>edited</span>}
              <time dateTime={new Date(m.createdAt).toISOString()}>{formatTime(m.createdAt)}</time>
              {m.isMine && <ReceiptIcon status={receipt} sendStatus={m.status} />}
            </span>
          </div>

          {canAct && (
            <div className={cx(s.actions, pickerOpen && s.actionsVisible)}>
              {emojis.length > 0 && (
                <IconButton ref={reactButton} icon="smile" label="React" size={18} onClick={() => setPickerOpen((v) => !v)} />
              )}
              <IconButton icon="reply" label="Reply" size={18} onClick={() => actions.onReply(m)} />
              {m.isMine && m.kind === "user" && (
                <IconButton icon="edit" label="Edit" size={18} onClick={() => actions.onEdit(m)} />
              )}
              {m.isMine && <IconButton icon="trash" label="Delete" size={18} onClick={() => actions.onDelete(m)} />}
              {pickerOpen && (
                <ReactionPicker
                  emojis={emojis}
                  anchor={reactButton.current}
                  alignRight={m.isMine}
                  onPick={(key) => {
                    setPickerOpen(false);
                    actions.onReact(m, key);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
          )}
        </div>

        {m.reactions.length > 0 && (
          <div className={s.reactions}>
            {m.reactions.map((r) => {
              const url = emojiUrl(r.key);
              return (
                <button
                  key={r.key}
                  type="button"
                  className={cx(s.reaction, r.mine && s.reactionMine)}
                  onClick={() => actions.onReact(m, r.key)}
                  aria-pressed={r.mine}
                  aria-label={`${r.count} reaction${r.count > 1 ? "s" : ""}${r.mine ? ", including yours" : ""}`}
                >
                  {url ? <img src={url} alt="" /> : <span>{r.key}</span>}
                  <span>{r.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {failed && (
          <div className={s.failedRow} role="alert">
            <Icon name="alert" size={14} /> Not sent
            <button type="button" onClick={() => actions.onResend(m)}>Retry</button>
            <button type="button" onClick={() => actions.onDiscard(m)}>Discard</button>
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
