import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthSession, Me } from "../../types/api";

/**
 * The single source of truth for "who is signed in".
 * The access token lives only in memory. A page reload gets a new one
 * through the httpOnly refresh cookie (see AuthBootstrap).
 */
export interface AuthState {
  status: "checking" | "authenticated" | "unauthenticated";
  user: Me | null;
  accessToken: string | null;
}

const initialState: AuthState = { status: "checking", user: null, accessToken: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<AuthSession>) {
      state.status = "authenticated";
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    userUpdated(state, action: PayloadAction<Me>) {
      state.user = action.payload;
    },
    signedOut(state) {
      state.status = "unauthenticated";
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { sessionStarted, userUpdated, signedOut } = authSlice.actions;
export default authSlice.reducer;

type WithAuth = { auth: AuthState };
export const selectAuthStatus = (s: WithAuth) => s.auth.status;
export const selectCurrentUser = (s: WithAuth) => s.auth.user;
export const selectAccessToken = (s: WithAuth) => s.auth.accessToken;
