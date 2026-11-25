import { UserDocument } from "../models/User.model";

/** What other users may see about someone. */
export interface PublicUserDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
}

/** What the signed-in user sees about themselves. */
export interface MeDto extends PublicUserDto {
  email: string;
  settings: { discoverable: boolean; dmPolicy: string };
  createdAt: string;
}

type UserLike = Pick<UserDocument, "username" | "displayName" | "avatarUrl" | "bio"> & {
  _id: unknown;
};

export const toPublicUser = (u: UserLike): PublicUserDto => ({
  id: String(u._id),
  username: u.username,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl ?? "",
  bio: u.bio ?? "",
});

export const toMe = (u: UserDocument): MeDto => ({
  ...toPublicUser(u),
  email: u.email,
  settings: {
    discoverable: u.settings?.discoverable ?? true,
    dmPolicy: u.settings?.dmPolicy ?? "everyone",
  },
  createdAt: u.createdAt.toISOString(),
});

export const PUBLIC_USER_FIELDS = "username displayName avatarUrl bio";
