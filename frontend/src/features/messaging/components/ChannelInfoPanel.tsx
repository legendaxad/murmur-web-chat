import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { skipToken } from "@reduxjs/toolkit/query";
import { useAppSelector } from "../../../app/hooks";
import { Avatar, Button, IconButton } from "../../../components/ui";
import { selectCurrentUser } from "../../auth/authSlice";
import { useBlockUserMutation, useUnblockUserMutation } from "../../contacts/contactsApi";
import { AddMembersModal } from "../../conversations/AddMembersModal";
import { useGetProfileQuery } from "../../users/usersApi";
import { usePresence } from "../../users/usePresence";
import { formatLastSeen } from "../../../utils/format";
import { getErrorMessage } from "../../../utils/errors";
import { leaveConversation } from "../sendbird/conversation";
import type { ChannelDto } from "../types";
import s from "./chat.module.css";

export function ChannelInfoPanel({ channel, onClose }: { channel: ChannelDto; onClose: () => void }) {
  const me = useAppSelector(selectCurrentUser);
  const navigate = useNavigate();
  const presence = usePresence(channel.members.map((m) => m.userId));
  const { data: peer } = useGetProfileQuery(channel.isDirect && channel.peerId ? channel.peerId : skipToken);
  const [block, { isLoading: blocking }] = useBlockUserMutation();
  const [unblock, { isLoading: unblocking }] = useUnblockUserMutation();
  const [adding, setAdding] = useState(false);

  const leave = async () => {
    if (!window.confirm(`Leave “${channel.title}”? You'll stop receiving its messages.`)) return;
    try {
      await leaveConversation(channel.url);
      navigate("/chat");
    } catch {
      toast.error("Couldn't leave the group. Please try again.");
    }
  };

  const toggleBlock = async () => {
    if (!channel.peerId) return;
    const isBlocked = peer?.relationship === "blocked";
    if (!isBlocked && !window.confirm(`Block ${channel.title}? They won't be able to message you or add you to groups.`)) return;
    const res = isBlocked ? await unblock(channel.peerId) : await block(channel.peerId);
    if ("error" in res) toast.error(getErrorMessage(res.error));
    else toast.success(isBlocked ? "Unblocked" : "Blocked");
  };

  const sortedMembers = [...channel.members].sort(
    (a, b) => Number(presence[b.userId]?.online ?? 0) - Number(presence[a.userId]?.online ?? 0) || a.nickname.localeCompare(b.nickname),
  );

  return (
    <aside className={s.info} aria-label="Conversation details">
      <header className={s.infoHeader}>
        <h2>Details</h2>
        <IconButton icon="x" label="Close details" onClick={onClose} />
      </header>

      <div className={s.infoBody}>
        <div className={s.infoHero}>
          <Avatar name={channel.title} src={channel.coverUrl} seed={channel.peerId ?? channel.url} size={88} />
          <h3>{channel.title}</h3>
          {channel.isDirect ? (
            <p>
              {peer ? `@${peer.username}` : ""}
              {channel.peerId && <> · {presence[channel.peerId]?.online ? "online" : formatLastSeen(presence[channel.peerId]?.lastSeenAt)}</>}
            </p>
          ) : (
            <p>Group · {channel.memberCount} members</p>
          )}
          {peer?.bio && <p className={s.infoBio}>{peer.bio}</p>}
        </div>

        {!channel.isDirect && (
          <section className={s.infoSection}>
            <div className={s.infoSectionHeader}>
              <h4>Members</h4>
              <Button size="sm" variant="soft" icon="userPlus" onClick={() => setAdding(true)}>
                Add
              </Button>
            </div>
            <ul className={s.memberList}>
              {sortedMembers.map((m) => (
                <li key={m.userId} className={s.member}>
                  <Avatar name={m.nickname} src={m.profileUrl} seed={m.userId} size={36} online={presence[m.userId]?.online} />
                  <span className={s.memberText}>
                    <span>
                      {m.nickname}
                      {m.userId === me?.id && " (you)"}
                    </span>
                    <span className={s.memberSub}>
                      {m.role === "operator" ? "Admin · " : ""}
                      {presence[m.userId]?.online ? "online" : formatLastSeen(presence[m.userId]?.lastSeenAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={s.infoActions}>
          {channel.isDirect ? (
            <Button variant="danger" icon="ban" block onClick={toggleBlock} loading={blocking || unblocking} disabled={!peer}>
              {peer?.relationship === "blocked" ? "Unblock" : "Block"} {channel.title}
            </Button>
          ) : (
            <Button variant="danger" icon="logout" block onClick={leave}>
              Leave group
            </Button>
          )}
        </section>
      </div>

      {adding && (
        <AddMembersModal
          channelUrl={channel.url}
          existingIds={channel.members.map((m) => m.userId)}
          onClose={() => setAdding(false)}
        />
      )}
    </aside>
  );
}
