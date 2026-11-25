import { sendbirdCall, sendbirdHttp, SendbirdApiError, SendbirdErrorCode } from "./client";

export interface SendbirdUser {
  user_id: string;
  nickname: string;
  profile_url: string;
  is_online: boolean;
  last_seen_at: number;
}

/** Creates the Sendbird user, or updates it if it already exists (idempotent). */
export async function upsertSendbirdUser(userId: string, nickname: string, profileUrl: string): Promise<void> {
  try {
    await sendbirdCall("createUser", () =>
      sendbirdHttp.post("/users", { user_id: userId, nickname, profile_url: profileUrl }),
    );
  } catch (err) {
    if (err instanceof SendbirdApiError && err.sendbirdCode === SendbirdErrorCode.USER_ALREADY_EXISTS) {
      await updateSendbirdUser(userId, { nickname, profileUrl });
      return;
    }
    throw err;
  }
}

export async function updateSendbirdUser(
  userId: string,
  input: { nickname?: string; profileUrl?: string },
): Promise<void> {
  const body: Record<string, string> = {};
  if (input.nickname !== undefined) body.nickname = input.nickname;
  if (input.profileUrl !== undefined) body.profile_url = input.profileUrl;
  await sendbirdCall("updateUser", () => sendbirdHttp.put(`/users/${encodeURIComponent(userId)}`, body));
}

export async function deleteSendbirdUser(userId: string): Promise<void> {
  await sendbirdCall("deleteUser", () => sendbirdHttp.delete(`/users/${encodeURIComponent(userId)}`));
}

/** Issues a short-lived session token: the credential the browser uses to connect to Sendbird. */
export async function issueSessionToken(userId: string, ttlMs: number): Promise<{ token: string; expiresAt: number }> {
  const data = await sendbirdCall<{ token: string; expires_at: number }>("issueSessionToken", () =>
    sendbirdHttp.post(`/users/${encodeURIComponent(userId)}/token`, { expires_at: Date.now() + ttlMs }),
  );
  return { token: data.token, expiresAt: data.expires_at };
}

/** Presence (is_online / last_seen_at) for up to 100 users. */
export async function getSendbirdUsers(userIds: string[]): Promise<SendbirdUser[]> {
  if (userIds.length === 0) return [];
  const data = await sendbirdCall<{ users: SendbirdUser[] }>("listUsers", () =>
    sendbirdHttp.get("/users", { params: { user_ids: userIds.slice(0, 100).join(","), limit: 100 } }),
  );
  return data.users;
}

export async function blockSendbirdUser(userId: string, targetId: string): Promise<void> {
  await sendbirdCall("blockUser", () =>
    sendbirdHttp.post(`/users/${encodeURIComponent(userId)}/block`, { target_id: targetId }),
  );
}

export async function unblockSendbirdUser(userId: string, targetId: string): Promise<void> {
  await sendbirdCall("unblockUser", () =>
    sendbirdHttp.delete(`/users/${encodeURIComponent(userId)}/block/${encodeURIComponent(targetId)}`),
  );
}
