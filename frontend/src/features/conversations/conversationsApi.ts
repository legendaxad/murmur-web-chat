import { baseApi, unwrap } from "../../app/baseApi";

/**
 * Creating conversations goes through the backend, which applies our rules
 * (blocks, DM policy, contacts-only groups). The new channel then reaches
 * the client through the Sendbird channel collection.
 */
export const conversationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createDirect: build.mutation<{ channelUrl: string }, string>({
      query: (userId) => ({ url: "/conversations/direct", method: "POST", body: { userId } }),
      transformResponse: unwrap<{ channelUrl: string }>,
    }),
    createGroup: build.mutation<{ channelUrl: string }, { name: string; memberIds: string[] }>({
      query: (body) => ({ url: "/conversations/groups", method: "POST", body }),
      transformResponse: unwrap<{ channelUrl: string }>,
    }),
    addMembers: build.mutation<void, { channelUrl: string; userIds: string[] }>({
      query: ({ channelUrl, userIds }) => ({
        url: `/conversations/${encodeURIComponent(channelUrl)}/members`,
        method: "POST",
        body: { userIds },
      }),
    }),
  }),
});

export const { useCreateDirectMutation, useCreateGroupMutation, useAddMembersMutation } = conversationsApi;
