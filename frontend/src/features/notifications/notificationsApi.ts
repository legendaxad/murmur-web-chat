import { baseApi, unwrap } from "../../app/baseApi";
import type { AppNotification } from "../../types/api";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<AppNotification[], void>({
      query: () => ({ url: "/notifications", params: { limit: 30 } }),
      transformResponse: unwrap<AppNotification[]>,
      providesTags: ["Notifications"],
    }),
    getUnreadNotificationCount: build.query<number, void>({
      query: () => "/notifications/unread-count",
      transformResponse: (res: { data: { count: number } }) => res.data.count,
      providesTags: ["Notifications"],
    }),
    markNotificationRead: build.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: ["Notifications"],
    }),
    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({ url: "/notifications/read-all", method: "POST" }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
