import { useEffect, useRef } from "react";
import { cx } from "../../../utils/format";
import type { EmojiDto } from "../types";
import s from "./chat.module.css";

interface Props {
  emojis: EmojiDto[];
  anchor: HTMLElement | null;
  alignRight: boolean;
  onPick: (key: string) => void;
  onClose: () => void;
}

/** Small emoji popover. Uses the app's Sendbird emoji set (images, not unicode). */
export function ReactionPicker({ emojis, anchor, alignRight, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  return (
    <div ref={ref} className={cx(s.picker, alignRight && s.pickerRight)} role="menu" aria-label="Pick a reaction">
      {emojis.slice(0, 24).map((e) => (
        <button key={e.key} type="button" role="menuitem" className={s.pickerItem} onClick={() => onPick(e.key)}>
          <img src={e.url} alt={e.key} />
        </button>
      ))}
    </div>
  );
}
