import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import type { ApiErrorBody } from "../types/api";

const isApiErrorBody = (v: unknown): v is ApiErrorBody =>
  typeof v === "object" && v !== null && "error" in v && typeof (v as ApiErrorBody).error?.message === "string";

/** Turns any RTK Query / thrown error into a message that's safe to show. */
export const getErrorMessage = (err: unknown, fallback = "Something went wrong"): string => {
  if (!err) return fallback;
  const fe = err as FetchBaseQueryError;
  if (typeof fe === "object" && "status" in fe) {
    if (isApiErrorBody(fe.data)) return fe.data.error.message;
    if (fe.status === "FETCH_ERROR") return "Can't reach the server. Check your connection.";
    if (fe.status === "TIMEOUT_ERROR") return "The request timed out.";
    return fallback;
  }
  const se = err as SerializedError;
  if (typeof se?.message === "string") return se.message;
  return fallback;
};

/** Field errors for form inputs, keyed by field path. */
export const getFieldErrors = (err: unknown): Record<string, string> => {
  const fe = err as FetchBaseQueryError;
  if (!fe || typeof fe !== "object" || !("data" in fe) || !isApiErrorBody(fe.data)) return {};
  const out: Record<string, string> = {};
  for (const d of fe.data.error.details ?? []) if (!out[d.path]) out[d.path] = d.message;
  return out;
};
