import { HydratedDocument, Schema, model } from "mongoose";

export enum UserStatus {
  ACTIVE = "active",
  BLOCKED = "blocked",
  DELETED = "deleted",
}

export enum DmPolicy {
  EVERYONE = "everyone",
  CONTACTS = "contacts",
}

export interface User {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  status: UserStatus;
  settings: { discoverable: boolean; dmPolicy: DmPolicy };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 50 },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 160 },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE, index: true },
    settings: {
      discoverable: { type: Boolean, default: true },
      dmPolicy: { type: String, enum: Object.values(DmPolicy), default: DmPolicy.EVERYONE },
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.index({ displayName: 1 });

export type UserDocument = HydratedDocument<User>;

/** "users" collection; the legacy anonymous accounts stay untouched in "newuser". */
export const UserModel = model<User>("User", userSchema, "users");
