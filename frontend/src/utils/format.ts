const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Short label for the channel list: time today, weekday this week, otherwise a date. */
export const formatListTimestamp = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(d, now)) return formatTime(ts);
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export const formatDayDivider = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};

export const isSameDay = (a: number, b: number) => sameDay(new Date(a), new Date(b));

export const formatLastSeen = (ts: number | null | undefined) => {
  if (!ts) return "offline";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "last seen just now";
  if (diff < 3_600_000) return `last seen ${Math.floor(diff / 60_000)} min ago`;
  if (sameDay(new Date(ts), new Date())) return `last seen at ${formatTime(ts)}`;
  return `last seen ${new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
