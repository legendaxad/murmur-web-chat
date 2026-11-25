import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, EmptyState, Icon, Spinner } from "../../../components/ui";
import { MESSAGE_GROUP_WINDOW_MS } from "../../../constants";
import { formatDayDivider, isSameDay } from "../../../utils/format";
import { useAppSelector } from "../../../app/hooks";
import { selectEmojis } from "../messagingSlice";
import type { MessageDto, ReceiptStatus } from "../types";
import { BubbleActions, MessageBubble } from "./MessageBubble";
import s from "./chat.module.css";

interface Props {
  messages: MessageDto[];
  status: "loading" | "ready" | "error";
  hasPrevious: boolean;
  loadingPrevious: boolean;
  receipts: Record<string, ReceiptStatus>;
  isGroup: boolean;
  actions: BubbleActions;
  onLoadPrevious: () => void;
  onRetry: () => void;
}

const NEAR_BOTTOM_PX = 120;

export function MessageList({
  messages,
  status,
  hasPrevious,
  loadingPrevious,
  receipts,
  isGroup,
  actions,
  onLoadPrevious,
  onRetry,
}: Props) {
  const emojis = useAppSelector(selectEmojis);
  const scroller = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prevScrollHeight = useRef<number | null>(null);
  const lastKey = useRef<string | undefined>(undefined);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = (smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < NEAR_BOTTOM_PX;
    setShowJump(distance > 600);
  };

  // Keep the view steady when older messages are prepended. Follow new messages
  // only if the user is already at the bottom (or sent the message).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const newest = messages[messages.length - 1];
    const newestChanged = newest?.key !== lastKey.current;
    lastKey.current = newest?.key;

    if (prevScrollHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = null;
    } else if (newestChanged && (stickToBottom.current || newest?.isMine)) {
      scrollToBottom();
    }
  }, [messages]);

  const loadOlder = useCallback(() => {
    if (!hasPrevious || loadingPrevious || status !== "ready") return;
    prevScrollHeight.current = scroller.current?.scrollHeight ?? null;
    onLoadPrevious();
  }, [hasPrevious, loadingPrevious, status, onLoadPrevious]);

  // Load older messages when the top comes into view.
  useEffect(() => {
    const node = topSentinel.current;
    if (!node || !scroller.current) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadOlder(), {
      root: scroller.current,
      rootMargin: "200px 0px 0px 0px",
    });
    io.observe(node);
    return () => io.disconnect();
  }, [loadOlder]);

  const jumpToMessage = useCallback((messageId: number) => {
    const node = scroller.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add(s.flash);
    setTimeout(() => node.classList.remove(s.flash), 1200);
  }, []);

  const bubbleActions = useMemo(() => ({ ...actions, onJumpToParent: jumpToMessage }), [actions, jumpToMessage]);

  if (status === "loading") {
    return (
      <div className={s.listCenter}>
        <Spinner label="Loading messages" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={s.listCenter}>
        <EmptyState
          icon="alert"
          title="Couldn't load this conversation"
          text="Check your connection and try again."
          action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}
        />
      </div>
    );
  }

  return (
    <div className={s.listWrap}>
      <div ref={scroller} className={s.list} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions">
        <div ref={topSentinel} className={s.sentinel} />
        {loadingPrevious && (
          <div className={s.loadingOlder}>
            <Spinner size={18} label="Loading older messages" />
          </div>
        )}
        {!hasPrevious && messages.length > 0 && <div className={s.beginning}>This is the beginning of your conversation</div>}

        {messages.length === 0 && (
          <div className={s.listCenter}>
            <EmptyState icon="chat" title="No messages yet" text="Say hello. Your first message starts the conversation." />
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || !isSameDay(prev.createdAt, m.createdAt);
          const sameRunAsPrev =
            !newDay && prev && prev.kind !== "admin" && prev.senderId === m.senderId && m.createdAt - prev.createdAt < MESSAGE_GROUP_WINDOW_MS;
          const sameRunAsNext =
            next &&
            isSameDay(next.createdAt, m.createdAt) &&
            next.kind !== "admin" &&
            next.senderId === m.senderId &&
            next.createdAt - m.createdAt < MESSAGE_GROUP_WINDOW_MS;

          return (
            <Fragment key={m.key}>
              {newDay && (
                <div className={s.dayDivider}>
                  <span>{formatDayDivider(m.createdAt)}</span>
                </div>
              )}
              <MessageBubble
                message={m}
                showHeader={!sameRunAsPrev}
                showAvatar={!sameRunAsNext}
                isGroup={isGroup}
                receipt={receipts[m.key]}
                emojis={emojis}
                actions={bubbleActions}
              />
            </Fragment>
          );
        })}
      </div>

      {showJump && (
        <button type="button" className={s.jumpButton} onClick={() => scrollToBottom(true)} aria-label="Jump to latest">
          <Icon name="arrowLeft" size={18} style={{ transform: "rotate(-90deg)" }} />
        </button>
      )}
    </div>
  );
}
