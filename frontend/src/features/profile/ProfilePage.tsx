import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { Avatar, Button, Icon, IconName, TextAreaField, TextField } from "../../components/ui";
import type { DmPolicy } from "../../types/api";
import { cx } from "../../utils/format";
import { getErrorMessage, getFieldErrors } from "../../utils/errors";
import { useLogoutMutation } from "../auth/authApi";
import { selectCurrentUser } from "../auth/authSlice";
import { selectTheme, themeChanged, ThemePreference } from "../ui/uiSlice";
import { useUpdateMeMutation } from "../users/usersApi";
import s from "./profile.module.css";

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
];

export default function ProfilePage() {
  const me = useAppSelector(selectCurrentUser)!;
  const theme = useAppSelector(selectTheme);
  const dispatch = useAppDispatch();
  const [updateMe, { isLoading, error }] = useUpdateMeMutation();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  const [form, setForm] = useState({ displayName: me.displayName, bio: me.bio, avatarUrl: me.avatarUrl });
  useEffect(() => setForm({ displayName: me.displayName, bio: me.bio, avatarUrl: me.avatarUrl }), [me]);

  const fieldErrors = getFieldErrors(error);
  const dirty = form.displayName !== me.displayName || form.bio !== me.bio || form.avatarUrl !== me.avatarUrl;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const res = await updateMe({ displayName: form.displayName.trim(), bio: form.bio.trim(), avatarUrl: form.avatarUrl.trim() });
    if ("data" in res) toast.success("Profile updated");
    else if (Object.keys(getFieldErrors(res.error)).length === 0) toast.error(getErrorMessage(res.error));
  };

  const setPrivacy = async (patch: { discoverable?: boolean; dmPolicy?: DmPolicy }) => {
    const res = await updateMe({ settings: patch });
    if ("error" in res) toast.error(getErrorMessage(res.error));
  };

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <Avatar name={form.displayName || me.displayName} src={form.avatarUrl || null} seed={me.id} size={84} />
        <div>
          <h1>{me.displayName}</h1>
          <p>
            @{me.username} · {me.email}
          </p>
        </div>
      </header>

      <section className={s.card}>
        <h2>Profile</h2>
        <form className={s.form} onSubmit={save}>
          <TextField
            label="Display name"
            value={form.displayName}
            maxLength={50}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            error={fieldErrors.displayName}
          />
          <TextAreaField
            label="Bio"
            value={form.bio}
            maxLength={160}
            rows={3}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            hint={`${form.bio.length}/160`}
            error={fieldErrors.bio}
          />
          <TextField
            label="Avatar URL"
            type="url"
            placeholder="https://…"
            value={form.avatarUrl}
            onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            error={fieldErrors.avatarUrl}
            hint="A link to a square image (https only)."
          />
          <div className={s.formActions}>
            <Button type="submit" loading={isLoading} disabled={!dirty || !form.displayName.trim()}>
              Save changes
            </Button>
          </div>
        </form>
      </section>

      <section className={s.card}>
        <h2>Privacy</h2>
        <label className={s.toggleRow}>
          <span>
            <span className={s.toggleTitle}>Appear in search</span>
            <span className={s.toggleText}>Let people find you by name or @username.</span>
          </span>
          <input
            type="checkbox"
            className={s.switch}
            checked={me.settings.discoverable}
            onChange={(e) => setPrivacy({ discoverable: e.target.checked })}
          />
        </label>
        <div className={s.toggleRow}>
          <span>
            <span className={s.toggleTitle}>Who can message you</span>
            <span className={s.toggleText}>Contacts-only blocks new direct messages from strangers.</span>
          </span>
          <select
            className={s.select}
            value={me.settings.dmPolicy}
            onChange={(e) => setPrivacy({ dmPolicy: e.target.value as DmPolicy })}
            aria-label="Who can message you"
          >
            <option value="everyone">Everyone</option>
            <option value="contacts">Contacts only</option>
          </select>
        </div>
      </section>

      <section className={s.card}>
        <h2>Appearance</h2>
        <div className={s.themes} role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={theme === t.value}
              className={cx(s.theme, theme === t.value && s.themeActive)}
              onClick={() => dispatch(themeChanged(t.value))}
            >
              <Icon name={t.icon} size={20} />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className={s.card}>
        <Button variant="danger" icon="logout" onClick={() => logout()} loading={loggingOut}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
