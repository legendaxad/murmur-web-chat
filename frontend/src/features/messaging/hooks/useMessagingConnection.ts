import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { authApi } from "../../auth/authApi";
import { selectCurrentUser } from "../../auth/authSlice";
import { startMessaging, stopMessaging } from "../sendbird/connection";
import { markActiveAsRead } from "../sendbird/conversation";

/**
 * Connects to Sendbird while a user is signed in, and disconnects on
 * sign-out or user change. Mounted once, in the authenticated app shell.
 */
export function useMessagingConnection() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectCurrentUser)?.id;

  useEffect(() => {
    if (!userId) return;
    void startMessaging({
      dispatch,
      myId: userId,
      fetchSession: () =>
        dispatch(authApi.endpoints.getSendbirdSession.initiate(undefined, { forceRefetch: true, subscribe: false })).unwrap(),
    });
    return () => {
      void stopMessaging();
    };
  }, [dispatch, userId]);

  useEffect(() => {
    const onVisible = () => markActiveAsRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
}
