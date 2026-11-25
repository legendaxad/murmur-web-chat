import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { UserRow } from "../../components/common/UserRow";
import { SearchInput } from "../../components/common/SearchInput";
import { Button, Icon, Modal, Spinner, TextField } from "../../components/ui";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { PublicUser } from "../../types/api";
import { cx } from "../../utils/format";
import { getErrorMessage } from "../../utils/errors";
import { useGetContactsQuery } from "../contacts/contactsApi";
import { useSearchUsersQuery } from "../users/usersApi";
import { useCreateDirectMutation, useCreateGroupMutation } from "./conversationsApi";
import s from "./conversations.module.css";

type Tab = "direct" | "group";

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("direct");
  return (
    <Modal title="New conversation" onClose={onClose}>
      <div className={s.tabs} role="tablist">
        <button role="tab" aria-selected={tab === "direct"} className={cx(s.tab, tab === "direct" && s.tabActive)} onClick={() => setTab("direct")}>
          <Icon name="user" size={16} /> Direct message
        </button>
        <button role="tab" aria-selected={tab === "group"} className={cx(s.tab, tab === "group" && s.tabActive)} onClick={() => setTab("group")}>
          <Icon name="users" size={16} /> New group
        </button>
      </div>
      {tab === "direct" ? <DirectTab onDone={onClose} /> : <GroupTab onDone={onClose} />}
    </Modal>
  );
}

function DirectTab({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim(), 250);
  const { data: contacts = [], isLoading: loadingContacts } = useGetContactsQuery();
  const { data: results, isFetching } = useSearchUsersQuery(q.length >= 1 ? q : skipToken);
  const [createDirect, { isLoading, error, originalArgs }] = useCreateDirectMutation();
  const navigate = useNavigate();

  const start = async (user: PublicUser) => {
    const res = await createDirect(user.id);
    if ("data" in res && res.data) {
      navigate(`/chat/${encodeURIComponent(res.data.channelUrl)}`);
      onDone();
    }
  };

  const list: PublicUser[] = q ? results ?? [] : contacts;

  return (
    <div className={s.tabBody}>
      <SearchInput label="Search people" placeholder="Search by name or @username" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      {error && <p className={s.error}>{getErrorMessage(error)}</p>}
      <p className={s.sectionLabel}>{q ? "People" : "Your contacts"}</p>
      <div className={s.results}>
        {(loadingContacts || (q && isFetching && !results)) && (
          <div className={s.center}>
            <Spinner />
          </div>
        )}
        {!q && !loadingContacts && contacts.length === 0 && (
          <p className={s.muted}>No contacts yet. Search for someone by name or @username.</p>
        )}
        {q && results && results.length === 0 && <p className={s.muted}>Nobody matches “{q}”.</p>}
        {list.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            onClick={() => start(u)}
            actions={isLoading && originalArgs === u.id ? <Spinner size={16} /> : <Icon name="chat" size={18} />}
          />
        ))}
      </div>
    </div>
  );
}

function GroupTab({ onDone }: { onDone: () => void }) {
  const { data: contacts = [], isLoading } = useGetContactsQuery();
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createGroup, { isLoading: creating, error }] = useCreateGroupMutation();
  const navigate = useNavigate();

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? contacts.filter((c) => c.displayName.toLowerCase().includes(f) || c.username.includes(f)) : contacts;
  }, [contacts, filter]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    const res = await createGroup({ name: name.trim(), memberIds: [...selected] });
    if ("data" in res && res.data) {
      navigate(`/chat/${encodeURIComponent(res.data.channelUrl)}`);
      onDone();
    }
  };

  return (
    <div className={s.tabBody}>
      <TextField label="Group name" placeholder="e.g. Weekend plans" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      {error && <p className={s.error}>{getErrorMessage(error)}</p>}
      <p className={s.sectionLabel}>
        Members <span className={s.muted}>· {selected.size} selected</span>
      </p>
      {contacts.length > 6 && <SearchInput label="Filter contacts" placeholder="Filter contacts" value={filter} onChange={(e) => setFilter(e.target.value)} />}
      <div className={s.results}>
        {isLoading && (
          <div className={s.center}>
            <Spinner />
          </div>
        )}
        {!isLoading && contacts.length === 0 && (
          <p className={s.muted}>Groups are made from your contacts. Add some contacts first.</p>
        )}
        {visible.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            selected={selected.has(u.id)}
            onClick={() => toggle(u.id)}
            actions={
              <span className={cx(s.check, selected.has(u.id) && s.checkOn)}>
                {selected.has(u.id) && <Icon name="check" size={14} strokeWidth={2.6} />}
              </span>
            }
          />
        ))}
      </div>
      <div className={s.footer}>
        <Button onClick={submit} loading={creating} disabled={!name.trim() || selected.size === 0}>
          Create group
        </Button>
      </div>
    </div>
  );
}
