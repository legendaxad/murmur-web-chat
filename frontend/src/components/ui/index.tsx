import {
  ButtonHTMLAttributes,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { cx, initials } from "../../utils/format";
import { Icon, IconName } from "./Icon";
import s from "./ui.module.css";

export { Icon } from "./Icon";
export type { IconName } from "./Icon";

/* ---------- Button ---------- */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "soft" | "danger";
  size?: "md" | "sm";
  block?: boolean;
  loading?: boolean;
  icon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, loading, icon, children, className, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.button, s[variant], size === "sm" && s.sm, block && s.block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={s.spinner} style={{ width: 16, height: 16 }} /> : icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
});

/* ---------- IconButton ---------- */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  active?: boolean;
  size?: number;
  badge?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, active, size = 20, badge, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(s.iconButton, active && s.iconButtonActive, className)}
      {...rest}
    >
      <Icon name={icon} size={size} />
      {badge ? <span className={cx(s.badge, s.badgeDot)}>{badge > 99 ? "99+" : badge}</span> : null}
    </button>
  );
});

/* ---------- Fields ---------- */
interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, className, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className={s.field}>
        <label className={s.label} htmlFor={inputId}>
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cx(s.input, error && s.inputInvalid, className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || hint ? `${inputId}-msg` : undefined}
          {...rest}
        />
        {(error || hint) && (
          <span id={`${inputId}-msg`} className={error ? s.error : s.hint}>
            {error ?? hint}
          </span>
        )}
      </div>
    );
  },
);

export function TextAreaField({
  label,
  error,
  hint,
  id,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={inputId}>
        {label}
      </label>
      <textarea id={inputId} className={cx(s.input, error && s.inputInvalid)} {...rest} />
      {(error || hint) && <span className={error ? s.error : s.hint}>{error ?? hint}</span>}
    </div>
  );
}

export const inputClassName = s.input;

/* ---------- Avatar ---------- */
const AVATAR_COLORS = ["#6e56cf", "#0ea5a4", "#e5484d", "#f59e0b", "#3b82f6", "#10b981", "#d946ef", "#64748b"];

const colorFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

interface AvatarProps {
  name: string;
  src?: string | null;
  seed?: string;
  size?: number;
  online?: boolean;
  className?: string;
}

/** Shows the image if there is one, otherwise initials on a color picked from the name/id. */
export function Avatar({ name, src, seed, size = 40, online, className }: AvatarProps) {
  return (
    <span
      className={cx(s.avatar, className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: src ? "var(--surface-3)" : colorFor(seed ?? name) }}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initials(name)}
      {online && <span className={s.presence} />}
    </span>
  );
}

/* ---------- Misc ---------- */
export const Spinner = ({ size = 20, label = "Loading" }: { size?: number; label?: string }) => (
  <span role="status" aria-label={label} className={s.spinner} style={{ width: size, height: size }} />
);

export const Badge = ({ count }: { count: number }) =>
  count > 0 ? <span className={s.badge}>{count > 99 ? "99+" : count}</span> : null;

export const Skeleton = ({ width, height, radius }: { width: number | string; height: number; radius?: number }) => (
  <span className={s.skeleton} style={{ display: "block", width, height, borderRadius: radius }} />
);

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Icon name={icon} size={26} />
      </span>
      <p className={s.emptyTitle}>{title}</p>
      {text && <p className={s.emptyText}>{text}</p>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}

export function Banner({
  tone,
  children,
  action,
}: {
  tone: "warning" | "error";
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div role="status" className={cx(s.banner, tone === "warning" ? s.bannerWarning : s.bannerError)}>
      <Icon name="alert" size={16} />
      <span>{children}</span>
      {action && <span className={s.bannerAction}>{action}</span>}
    </div>
  );
}

/* ---------- Modal ---------- */
interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Runs once on open: focus the first field, close on Escape, give focus back on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const firstInput = dialogRef.current?.querySelector<HTMLElement>("input, textarea, button:not([data-close])");
    (firstInput ?? dialogRef.current)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className={s.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={s.modalHeader}>
          <h2 id={titleId} className={s.modalTitle}>
            {title}
          </h2>
          <IconButton icon="x" label="Close" onClick={onClose} data-close />
        </div>
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFooter}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
