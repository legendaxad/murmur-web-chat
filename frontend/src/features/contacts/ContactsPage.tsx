import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { skipToken } from "@reduxjs/toolkit/query";
import { SearchInput } from "../../components/common/SearchInput";
import { UserRow } from "../../components/common/UserRow";
import { Badge, Button, EmptyState, IconButton, Skeleton } from "../../components/ui";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { PublicUser, Relationship, SearchUser } from "../../types/api";
import { cx, formatLastSeen } from "../../utils/format";
import { getErrorMessage } from "../../utils/errors";
import { useCreateDirectMutation } from "../conversations/conversationsApi";
import { usePresence } from "../users/usePresence";
import { useSearchUsersQuery } from "../users/usersApi";
import {
  useAcceptRequestMutation,
  useGetBlockedQuery,
  useGetContactsQuery,
  useGetRequestsQuery,
  useRemoveContactMutation,
  useRemoveRequestMutation,
  useSendRequestMutation,
  useUnblockUserMutation,
} from "./contactsApi";
import s from "./contacts.module.css";

type Tab = "contacts" | "requests" | "blocked";

/** Shows a toast for API errors so every action button behaves the same way. */
const report = async (p: Promise<{ error?: unknown } | { data?: unknown }>, success?: string) => {
  const res = await p;
  if ("error" in res && res.error) toast.error(getErrorMessage(res.error));
  else if (success) toast.success(success);
};

export default function ContactsPage() {
  const [tab, setTab] = useState<Tab>("contacts");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim(), 250);
  const { data: requests = [] } = useGetRequestsQuery();
  const incoming = requests.filter((r) => r.direction === "incoming");

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1>Contacts</h1>
        <p>Find people, manage requests and choose who can reach you.</p>
      </header>

      <div className={s.search}>
        <SearchInput
          label="Find people"
          placeholder="Find people by name or @username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {q ? (
        <SearchResults q={q} />
      ) : (
        <>
          <div className={s.tabs} role="tablist">
            {(
              [
                ["contacts", "Contacts", 0],
                ["requests", "Requests", incoming.length],
                ["blocked", "Blocked", 0],
              ] as const
            ).map(([key, label, count]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={cx(s.tab, tab === key && s.tabActive)} onClick={() => setTab(key)}>
                {label}
                <Badge count={count} />
              </button>
            ))}
          </div>
          {tab === "contacts" && <ContactsList />}
          {tab === "requests" && <RequestsList />}
          {tab === "blocked" && <BlockedList />}
        </>
      )}
    </div>
  );
}

function useStartChat() {
  const [createDirect] = useCreateDirectMutation();
  const navigate = useNavigate();
  return async (userId: string) => {
    const res = await createDirect(userId);
    if ("data" in res && res.data) navigate(`/chat/${encodeURIComponent(res.data.channelUrl)}`);
    else if ("error" in res) toast.error(getErrorMessage(res.error));
  };
}

const ListSkeleton = () => (
  <div className={s.list}>
    {Array.from({ length: 5 }, (_, i) => (
      <div key={i} className={s.skeletonRow}>
        <Skeleton width={42} height={42} radius={21} />
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          <Skeleton width="40%" height={12} />
          <Skeleton width="25%" height={10} />
        </div>
      </div>
    ))}
  </div>
);

function ContactsList() {
  const { data: contacts, isLoading, isError, refetch } = useGetContactsQuery();
  const presence = usePresence(contacts?.map((c) => c.id) ?? []);
  const [remove] = useRemoveContactMutation();
  const startChat = useStartChat();

  if (isLoading) return <ListSkeleton />;
  if (isError)
    return <EmptyState icon="alert" title="Couldn't load contacts" action={<Button variant="secondary" onClick={() => refetch()}>Try again</Button>} />;
  if (!contacts?.length)
    return <EmptyState icon="users" title="No contacts yet" text="Search for people above and send them a contact request." />;

  const sorted = [...contacts].sort((a, b) => Number(presence[b.id]?.online ?? 0) - Number(presence[a.id]?.online ?? 0));

  return (
    <div className={s.list}>
      {sorted.map((u) => (
        <UserRow
          key={u.id}
          user={u}
          online={presence[u.id]?.online}
          subtitle={
            <>
              @{u.username} · {presence[u.id]?.online ? <span className={s.online}>online</span> : formatLastSeen(presence[u.id]?.lastSeenAt)}
            </>
          }
          actions={
            <>
              <Button size="sm" variant="soft" icon="chat" onClick={() => startChat(u.id)}>
                Message
              </Button>
              <IconButton
                icon="trash"
                label={`Remove ${u.displayName}`}
                onClick={() => {
                  if (window.confirm(`Remove ${u.displayName} from your contacts?`)) void report(remove(u.id), "Contact removed");
                }}
              />
            </>
          }
        />
      ))}
    </div>
  );
}

function RequestsList() {
  const { data: requests, isLoading } = useGetRequestsQuery();
  const [accept] = useAcceptRequestMutation();
  const [removeRequest] = useRemoveRequestMutation();

  if (isLoading) return <ListSkeleton />;
  if (!requests?.length) return <EmptyState icon="userPlus" title="No pending requests" text="Requests you send or receive appear here." />;

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  return (
    <div className={s.list}>
      {incoming.length > 0 && <p className={s.sectionLabel}>Received</p>}
      {incoming.map((r) => (
        <UserRow
          key={r.id}
          user={r.user}
          actions={
            <>
              <Button size="sm" onClick={() => report(accept(r.id), `You and ${r.user.displayName} are now contacts`)}>
                Accept
              </Button>
              <Button size="sm" variant="secondary" onClick={() => report(removeRequest(r.id))}>
                Decline
              </Button>
            </>
          }
        />
      ))}
      {outgoing.length > 0 && <p className={s.sectionLabel}>Sent</p>}
      {outgoing.map((r) => (
        <UserRow
          key={r.id}
          user={r.user}
          subtitle={`@${r.user.username} · pending`}
          actions={
            <Button size="sm" variant="ghost" onClick={() => report(removeRequest(r.id), "Request cancelled")}>
              Cancel
            </Button>
          }
        />
      ))}
    </div>
  );
}

function BlockedList() {
  const { data: blocked, isLoading } = useGetBlockedQuery();
  const [unblock] = useUnblockUserMutation();
  if (isLoading) return <ListSkeleton />;
  if (!blocked?.length)
    return <EmptyState icon="shield" title="Nobody is blocked" text="Blocked people can't message you, find you or add you to groups." />;
  return (
    <div className={s.list}>
      {blocked.map((u: PublicUser) => (
        <UserRow
          key={u.id}
          user={u}
          actions={
            <Button size="sm" variant="secondary" onClick={() => report(unblock(u.id), `${u.displayName} unblocked`)}>
              Unblock
            </Button>
          }
        />
      ))}
    </div>
  );
}

const relationshipAction = (
  r: Relationship,
): { label: string; variant: "primary" | "secondary" | "ghost"; disabled?: boolean } | null => {
  switch (r) {
    case "none":
      return { label: "Add contact", variant: "primary" };
    case "incoming":
      return { label: "Accept request", variant: "primary" };
    case "outgoing":
      return { label: "Requested", variant: "ghost", disabled: true };
    case "contacts":
      return { label: "Contact", variant: "ghost", disabled: true };
    default:
      return null;
  }
};

function SearchResults({ q }: { q: string }) {
  const { data, isFetching, isError } = useSearchUsersQuery(q || skipToken);
  const [sendRequest, { isLoading, originalArgs }] = useSendRequestMutation();
  const startChat = useStartChat();

  if (isFetching && !data) return <ListSkeleton />;
  if (isError) return <EmptyState icon="alert" title="Search failed" text="Please try again." />;
  if (!data?.length) return <EmptyState icon="search" title={`Nobody matches “${q}”`} text="Check the spelling, or try their @username." />;

  return (
    <div className={s.list}>
      {data.map((u: SearchUser) => {
        const action = relationshipAction(u.relationship);
        return (
          <UserRow
            key={u.id}
            user={u}
            actions={
              <>
                <IconButton icon="chat" label={`Message ${u.displayName}`} onClick={() => startChat(u.id)} />
                {action && (
                  <Button
                    size="sm"
                    variant={action.variant}
                    disabled={action.disabled}
                    loading={isLoading && originalArgs === u.id}
                    onClick={() =>
                      report(sendRequest(u.id), u.relationship === "incoming" ? "Request accepted" : "Contact request sent")
                    }
                  >
                    {action.label}
                  </Button>
                )}
              </>
            }
          />
        );
      })}
    </div>
  );
}
