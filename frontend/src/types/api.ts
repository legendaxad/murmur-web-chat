/** Types shared with the backend API. Keep in sync with backend/src/services/dto.ts. */

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
}

export type DmPolicy = "everyone" | "contacts";

export interface Me extends PublicUser {
  email: string;
  settings: { discoverable: boolean; dmPolicy: DmPolicy };
  createdAt: string;
}

export type Relationship = "self" | "none" | "outgoing" | "incoming" | "contacts" | "blocked";

export interface SearchUser extends PublicUser {
  relationship: Relationship;
}

export interface Profile extends PublicUser {
  relationship: Relationship;
  memberSince: string;
}

export interface Presence {
  userId: string;
  online: boolean;
  lastSeenAt: number | null;
}

export interface ContactRequest {
  id: string;
  user: PublicUser;
  direction: "incoming" | "outgoing";
  createdAt: string;
}

export type NotificationType = "contact_request" | "contact_accepted" | "group_added";

export interface AppNotification {
  id: string;
  type: NotificationType;
  actor: PublicUser | null;
  data: { channelUrl?: string; channelName?: string; friendshipId?: string };
  readAt: string | null;
  createdAt: string;
}

export interface AuthSession {
  user: Me;
  accessToken: string;
}

export interface SendbirdSession {
  appId: string;
  userId: string;
  token: string;
  expiresAt: number;
}

export interface ApiErrorBody {
  error: { code: number; message: string; details?: { path: string; message: string }[] };
}

/** Every successful response is wrapped as { data }. */
export interface ApiEnvelope<T> {
  data: T;
}
