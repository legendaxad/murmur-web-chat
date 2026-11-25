import { baseApi, unwrap } from "../../app/baseApi";
import { PRESENCE_POLL_MS } from "../../constants";
import type { Me, Presence, Profile, SearchUser } from "../../types/api";
import { userUpdated } from "../auth/authSlice";

export interface UpdateMeBody {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  settings?: Partial<Me["settings"]>;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchUsers: build.query<SearchUser[], string>({
      query: (q) => ({ url: "/users/search", params: { q } }),
      transformResponse: unwrap<SearchUser[]>,
      providesTags: ["Search"],
    }),
    getProfile: build.query<Profile, string>({
      query: (id) => `/users/${id}`,
      transformResponse: unwrap<Profile>,
      providesTags: (_r, _e, id) => [{ type: "Profile", id }],
    }),
    /** ids must be sorted and joined, so each set of users has one cache entry. */
    getPresence: build.query<Record<string, Presence>, string>({
      query: (ids) => ({ url: "/users/presence", params: { ids } }),
      transformResponse: (res: { data: Presence[] }) =>
        Object.fromEntries(res.data.map((p) => [p.userId, p])),
    }),
    updateMe: build.mutation<Me, UpdateMeBody>({
      query: (body) => ({ url: "/users/me", method: "PATCH", body }),
      transformResponse: unwrap<Me>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(userUpdated(data));
      },
    }),
  }),
});

export const { useSearchUsersQuery, useGetProfileQuery, useGetPresenceQuery, useUpdateMeMutation } = usersApi;

export const PRESENCE_OPTIONS = { pollingInterval: PRESENCE_POLL_MS, skipPollingIfUnfocused: true } as const;
