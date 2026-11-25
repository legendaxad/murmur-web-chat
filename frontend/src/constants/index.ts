/** API base URL. Empty in development: requests go through the CRA proxy. */
export const API_URL = `${process.env.REACT_APP_API_URL ?? ""}/api`;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const PRESENCE_POLL_MS = 30_000;
export const NOTIFICATIONS_POLL_MS = 30_000;

/** Messages from the same sender closer together than this are grouped visually. */
export const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;

export const CHANNEL_TYPE = {
  DIRECT: "direct",
  GROUP: "group",
} as const;

/** Product name shown in the UI. Change it in one place. */
export const APP_NAME = "Murmur";
