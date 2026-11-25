import { baseApi, unwrap } from "../../app/baseApi";
import type { ApiEnvelope, AuthSession, SendbirdSession } from "../../types/api";
import { sessionStarted, signedOut } from "./authSlice";

export interface LoginBody {
  identifier: string;
  password: string;
}

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthSession, LoginBody>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: unwrap<AuthSession>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(sessionStarted(data));
      },
    }),
    register: build.mutation<AuthSession, RegisterBody>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      transformResponse: unwrap<AuthSession>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(sessionStarted(data));
      },
    }),
    /** Restores the session from the httpOnly refresh cookie (page load). */
    restoreSession: build.mutation<AuthSession, void>({
      query: () => ({ url: "/auth/refresh", method: "POST" }),
      transformResponse: unwrap<AuthSession>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(sessionStarted(data));
        } catch {
          dispatch(signedOut());
        }
      },
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        // Sign out locally even if the request fails (e.g. offline).
        await queryFulfilled.catch(() => undefined);
        dispatch(signedOut());
        dispatch(baseApi.util.resetApiState());
      },
    }),
    /** Never cached: a session token is fetched fresh for every (re)connect. */
    getSendbirdSession: build.query<SendbirdSession, void>({
      query: () => "/sendbird/session-token",
      transformResponse: (res: ApiEnvelope<SendbirdSession>) => res.data,
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useLogoutMutation } = authApi;
