import { ReactNode } from "react";
import type { PublicUser } from "../../types/api";
import { cx } from "../../utils/format";
import { Avatar } from "../ui";
import s from "./common.module.css";

interface UserRowProps {
  user: PublicUser;
  online?: boolean;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

/** A user line (avatar, name, @username, actions), used in contacts, search and the new-chat dialogs. */
export function UserRow({ user, online, subtitle, actions, onClick, selected }: UserRowProps) {
  const body = (
    <>
      <Avatar name={user.displayName} src={user.avatarUrl} seed={user.id} size={42} online={online} />
      <span className={s.userText}>
        <span className={s.userName}>{user.displayName}</span>
        <span className={s.userSub}>{subtitle ?? `@${user.username}`}</span>
      </span>
    </>
  );

  return (
    <div className={cx(s.userRow, onClick && s.userRowClickable, selected && s.userRowSelected)}>
      {onClick ? (
        <button type="button" className={s.userMain} onClick={onClick} aria-pressed={selected}>
          {body}
        </button>
      ) : (
        <div className={s.userMain}>{body}</div>
      )}
      {actions && <div className={s.userActions}>{actions}</div>}
    </div>
  );
}
