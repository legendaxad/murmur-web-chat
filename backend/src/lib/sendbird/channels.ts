import { sendbirdCall, sendbirdHttp } from "./client";

/** Custom types we use to tell direct chats from groups on both server and client. */
export const ChannelCustomType = {
  DIRECT: "direct",
  GROUP: "group",
} as const;

export interface SendbirdChannel {
  channel_url: string;
  name: string;
  cover_url: string;
  custom_type: string;
  is_distinct: boolean;
  member_count: number;
}

export async function createGroupChannel(input: {
  userIds: string[];
  isDistinct: boolean;
  customType: string;
  name?: string;
  coverUrl?: string;
  operatorIds?: string[];
}): Promise<SendbirdChannel> {
  return sendbirdCall<SendbirdChannel>("createChannel", () =>
    sendbirdHttp.post("/group_channels", {
      user_ids: input.userIds,
      is_distinct: input.isDistinct,
      custom_type: input.customType,
      name: input.name,
      cover_url: input.coverUrl,
      operator_ids: input.operatorIds,
    }),
  );
}

export async function getGroupChannel(channelUrl: string): Promise<SendbirdChannel> {
  return sendbirdCall<SendbirdChannel>("getChannel", () =>
    sendbirdHttp.get(`/group_channels/${encodeURIComponent(channelUrl)}`),
  );
}

export async function isChannelMember(channelUrl: string, userId: string): Promise<boolean> {
  const data = await sendbirdCall<{ is_member: boolean; state?: string }>("checkMember", () =>
    sendbirdHttp.get(`/group_channels/${encodeURIComponent(channelUrl)}/members/${encodeURIComponent(userId)}`),
  );
  return data.is_member && (data.state === undefined || data.state === "joined");
}

export async function inviteToChannel(channelUrl: string, inviterId: string, userIds: string[]): Promise<void> {
  await sendbirdCall("inviteMembers", () =>
    sendbirdHttp.post(`/group_channels/${encodeURIComponent(channelUrl)}/invite`, {
      user_ids: userIds,
      inviter_id: inviterId,
    }),
  );
}
