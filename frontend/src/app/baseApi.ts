import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { API_URL } from "../constants";
import { sessionStarted, signedOut, AuthState } from "../features/auth/authSlice";
import type { ApiEnvelope, AuthSession } from "../types/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: "include", // sends the httpOnly refresh cookie to /api/auth/*
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Requested-With", "fetch"); // CSRF guard checked by the backend
    return headers;
  },
});

/**
 * One refresh at a time. Requests that get a 401 while a refresh is running
 * wait for it instead of starting their own.
 */
let refreshInFlight: Promise<AuthSession | null> | null = null;

export const refreshSession = (api: Parameters<BaseQueryFn>[1]): Promise<AuthSession | null> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await rawBaseQuery({ url: "/auth/refresh", method: "POST" }, api, {});
      if (res.data) {
        const session = (res.data as ApiEnvelope<AuthSession>).data;
        api.dispatch(sessionStarted(session));
        return session;
      }
      api.dispatch(signedOut());
      return null;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const NO_REAUTH = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

/** On 401, refresh the access token once and retry the original request. */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra);
  const url = typeof args === "string" ? args : args.url;

  if (result.error?.status === 401 && !NO_REAUTH.includes(url)) {
    const session = await refreshSession(api);
    if (session) result = await rawBaseQuery(args, api, extra);
  }
  return result;
};

/** Unwraps { data } so endpoints work with the payload directly. */
export const unwrap = <T,>(res: ApiEnvelope<T>) => res.data;

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Me", "Contacts", "Requests", "Blocked", "Notifications", "Profile", "Search"],
  endpoints: () => ({}),
});
