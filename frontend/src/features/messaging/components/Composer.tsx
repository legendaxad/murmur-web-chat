import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { Icon, IconButton } from "../../../components/ui";
import { MAX_FILE_BYTES } from "../../../constants";
import { composerTargetSet, selectComposerTarget } from "../messagingSlice";
import { editMessage, sendFile, sendText, setTyping } from "../sendbird/conversation";
import s from "./chat.module.css";

const TYPING_THROTTLE_MS = 3000;
const TYPING_IDLE_MS = 4000;
const MAX_LENGTH = 5000;

/** Unsent drafts per conversation, kept for this browser session only. */
const drafts = new Map<string, string>();

export function Composer({ channelUrl, disabled }: { channelUrl: string; disabled?: string }) {
  const dispatch = useAppDispatch();
  const target = useAppSelector((st) => selectComposerTarget(st, channelUrl));
  const [text, setText] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingSentAt = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Restore this conversation's draft, and save it when leaving.
  useEffect(() => {
    const node = textarea.current;
    const timer = idleTimer;
    setText(drafts.get(channelUrl) ?? "");
    return () => {
      setTyping(channelUrl, false);
      clearTimeout(timer.current);
      if (node?.value) drafts.set(channelUrl, node.value);
      else drafts.delete(channelUrl);
    };
  }, [channelUrl]);

  // Editing a message pre-fills the composer with its text.
  useEffect(() => {
    if (target?.mode === "edit") setText(target.message.text);
    if (target) textarea.current?.focus();
  }, [target]);

  // Grow with the content, up to the CSS max-height.
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const clearTarget = () => dispatch(composerTargetSet({ url: channelUrl, target: null }));

  const stopTyping = () => {
    clearTimeout(idleTimer.current);
    if (typingSentAt.current) setTyping(channelUrl, false);
    typingSentAt.current = 0;
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (target?.mode === "edit") return;
    const now = Date.now();
    if (now - typingSentAt.current > TYPING_THROTTLE_MS) {
      typingSentAt.current = now;
      setTyping(channelUrl, true);
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      if (target?.mode === "edit") {
        if (value !== target.message.text) await editMessage(channelUrl, target.message.key, value);
      } else {
        sendText(channelUrl, value, target?.mode === "reply" ? target.message.messageId : undefined);
      }
      setText("");
      drafts.delete(channelUrl);
      clearTarget();
      stopTyping();
    } catch {
      toast.error("Couldn't send your message. Please try again.");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape" && target) {
      if (target.mode === "edit") setText("");
      clearTarget();
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 10)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      try {
        sendFile(channelUrl, file, target?.mode === "reply" ? target.message.messageId : undefined);
      } catch {
        toast.error(`Couldn't send ${file.name}.`);
      }
    }
    if (target?.mode === "reply") clearTarget();
    if (fileInput.current) fileInput.current.value = "";
  };

  if (disabled) {
    return <div className={s.composerDisabled}>{disabled}</div>;
  }

  return (
    <div className={s.composer}>
      {target && (
        <div className={s.composerTarget}>
          <Icon name={target.mode === "reply" ? "reply" : "edit"} size={18} />
          <div className={s.composerTargetText}>
            <span className={s.composerTargetTitle}>
              {target.mode === "reply" ? `Replying to ${target.message.isMine ? "yourself" : target.message.senderName}` : "Editing message"}
            </span>
            <span className={s.composerTargetPreview}>{target.message.text || target.message.file?.name}</span>
          </div>
          <IconButton
            icon="x"
            label="Cancel"
            size={18}
            onClick={() => {
              if (target.mode === "edit") setText("");
              clearTarget();
            }}
          />
        </div>
      )}

      <div className={s.composerRow}>
        {target?.mode !== "edit" && (
          <>
            <IconButton icon="paperclip" label="Attach files" onClick={() => fileInput.current?.click()} />
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </>
        )}
        <label className={s.composerField}>
          <span className="visually-hidden">Message</span>
          <textarea
            ref={textarea}
            rows={1}
            value={text}
            maxLength={MAX_LENGTH}
            placeholder="Write a message…"
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={stopTyping}
            onPaste={(e) => {
              if (e.clipboardData.files.length) {
                e.preventDefault();
                onFiles(e.clipboardData.files);
              }
            }}
          />
        </label>
        <button type="button" className={s.sendButton} onClick={() => void submit()} disabled={!text.trim()} aria-label={target?.mode === "edit" ? "Save" : "Send"}>
          <Icon name={target?.mode === "edit" ? "check" : "send"} size={20} />
        </button>
      </div>
    </div>
  );
}
