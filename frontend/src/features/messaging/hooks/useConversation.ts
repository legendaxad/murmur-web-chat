import { useEffect, useMemo } from "react";
import { useAppSelector } from "../../../app/hooks";
import { makeSelectMessages, selectConnection, selectConversation } from "../messagingSlice";
import { closeConversation, openConversation } from "../sendbird/conversation";

/** Opens the conversation's message collection while the component is mounted. */
export function useConversation(url: string) {
  const connection = useAppSelector(selectConnection);
  const selectMessages = useMemo(makeSelectMessages, []);
  const messages = useAppSelector((s) => selectMessages(s, url));
  const conversation = useAppSelector((s) => selectConversation(s, url));

  // (Re)open once the connection is up. After a reconnect the collection fills any gap by itself.
  const ready = connection === "open" || connection === "reconnecting";
  useEffect(() => {
    if (!ready) return;
    void openConversation(url);
    return () => closeConversation();
  }, [url, ready]);

  return {
    messages,
    status: conversation?.status ?? "loading",
    hasPrevious: conversation?.hasPrevious ?? false,
    loadingPrevious: conversation?.loadingPrevious ?? false,
    receipts: conversation?.receipts ?? {},
  };
}
