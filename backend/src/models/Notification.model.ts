import { Schema, model } from "mongoose";

/**
 * App-level notifications only (contacts, group invites).
 * Unread chat counts come from Sendbird and are not stored here.
 */
export enum NotificationType {
  CONTACT_REQUEST = "contact_request",
  CONTACT_ACCEPTED = "contact_accepted",
  GROUP_ADDED = "group_added",
}

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    data: {
      channelUrl: { type: String },
      channelName: { type: String },
      friendshipId: { type: Schema.Types.ObjectId },
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
// Delete notifications after 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const NotificationModel = model("Notification", notificationSchema, "notifications");
