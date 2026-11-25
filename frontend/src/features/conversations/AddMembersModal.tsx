import { useState } from "react";
import { toast } from "react-toastify";
import { UserRow } from "../../components/common/UserRow";
import { Button, Icon, Modal, Spinner } from "../../components/ui";
import { cx } from "../../utils/format";
import { getErrorMessage } from "../../utils/errors";
import { useGetContactsQuery } from "../contacts/contactsApi";
import { useAddMembersMutation } from "./conversationsApi";
import s from "./conversations.module.css";

export function AddMembersModal({ channelUrl, existingIds, onClose }: { channelUrl: string; existingIds: string[]; onClose: () => void }) {
  const { data: contacts = [], isLoading } = useGetContactsQuery();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addMembers, { isLoading: adding, error }] = useAddMembersMutation();
  const candidates = contacts.filter((c) => !existingIds.includes(c.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    const res = await addMembers({ channelUrl, userIds: [...selected] });
    if (!("error" in res)) {
      toast.success(`Added ${selected.size} member${selected.size > 1 ? "s" : ""}`);
      onClose();
    }
  };

  return (
    <Modal
      title="Add members"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={adding} disabled={selected.size === 0}>
            Add {selected.size || ""}
          </Button>
        </>
      }
    >
      {error && <p className={s.error}>{getErrorMessage(error)}</p>}
      <div className={s.results}>
        {isLoading && (
          <div className={s.center}>
            <Spinner />
          </div>
        )}
        {!isLoading && candidates.length === 0 && <p className={s.muted}>All your contacts are already in this group.</p>}
        {candidates.map((u) => (
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
    </Modal>
  );
}
