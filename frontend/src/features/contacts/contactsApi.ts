import { baseApi, unwrap } from "../../app/baseApi";
import type { ContactRequest, PublicUser } from "../../types/api";

/**
 * Any change to contacts can change search results, profiles and the
 * request list, so mutations invalidate all of those tags together.
 */
const RELATIONSHIP_TAGS = ["Contacts", "Requests", "Search", "Profile", "Blocked", "Notifications"] as const;

export const contactsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getContacts: build.query<PublicUser[], void>({
      query: () => "/contacts",
      transformResponse: unwrap<PublicUser[]>,
      providesTags: ["Contacts"],
    }),
    getRequests: build.query<ContactRequest[], void>({
      query: () => "/contacts/requests",
      transformResponse: unwrap<ContactRequest[]>,
      providesTags: ["Requests"],
    }),
    getBlocked: build.query<PublicUser[], void>({
      query: () => "/contacts/blocked",
      transformResponse: unwrap<PublicUser[]>,
      providesTags: ["Blocked"],
    }),
    sendRequest: build.mutation<{ status: "pending" | "accepted" }, string>({
      query: (userId) => ({ url: "/contacts/requests", method: "POST", body: { userId } }),
      transformResponse: unwrap<{ status: "pending" | "accepted" }>,
      invalidatesTags: [...RELATIONSHIP_TAGS],
    }),
    acceptRequest: build.mutation<void, string>({
      query: (id) => ({ url: `/contacts/requests/${id}/accept`, method: "POST" }),
      invalidatesTags: [...RELATIONSHIP_TAGS],
    }),
    removeRequest: build.mutation<void, string>({
      query: (id) => ({ url: `/contacts/requests/${id}`, method: "DELETE" }),
      invalidatesTags: [...RELATIONSHIP_TAGS],
    }),
    removeContact: build.mutation<void, string>({
      query: (userId) => ({ url: `/contacts/${userId}`, method: "DELETE" }),
      invalidatesTags: [...RELATIONSHIP_TAGS],
    }),
    blockUser: build.mutation<void, string>({
      query: (userId) => ({ url: `/contacts/${userId}/block`, method: "POST" }),
      invalidatesTags: [...RELATIONSHIP_TAGS],
    }),
    unblockUser: build.mutation<void, string>({
      query: (userId) => ({ url: `/contacts/${userId}/block`, method: "DELETE" }),
      invalidatesTags: [...RELATIONSHIP_TAGS],
    }),
  }),
});

export const {
  useGetContactsQuery,
  useGetRequestsQuery,
  useGetBlockedQuery,
  useSendRequestMutation,
  useAcceptRequestMutation,
  useRemoveRequestMutation,
  useRemoveContactMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
} = contactsApi;
