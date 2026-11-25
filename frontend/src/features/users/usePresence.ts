import { skipToken } from "@reduxjs/toolkit/query";
import { useMemo } from "react";
import type { Presence } from "../../types/api";
import { PRESENCE_OPTIONS, useGetPresenceQuery } from "./usersApi";

/**
 * Presence for a set of users, re-fetched every 30s while the tab is focused.
 * One request covers the whole set (e.g. every DM peer in the sidebar).
 */
export function usePresence(userIds: (string | null | undefined)[]): Record<string, Presence> {
  const key = useMemo(
    () => [...new Set(userIds.filter((id): id is string => Boolean(id)))].sort().slice(0, 100).join(","),
    [userIds],
  );
  const { data } = useGetPresenceQuery(key || skipToken, PRESENCE_OPTIONS);
  return data ?? EMPTY;
}

const EMPTY: Record<string, Presence> = {};
