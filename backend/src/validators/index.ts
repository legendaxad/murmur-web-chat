import { z } from "zod";
import { DmPolicy } from "../models/User.model";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9_.]+$/, "Use only letters, numbers, underscores and dots");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const displayName = z.string().trim().min(1, "Display name is required").max(50);

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https:\/\//i.test(v), "Must be an https:// URL");

/* ---------- auth ---------- */
export const registerSchema = z.object({
  username,
  email: z.email("Invalid email").trim().toLowerCase(),
  password,
  displayName,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Username or email is required").max(254),
  password: z.string().min(1, "Password is required").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* ---------- users ---------- */
export const updateMeSchema = z
  .object({
    displayName: displayName.optional(),
    bio: z.string().trim().max(160).optional(),
    avatarUrl: httpUrl.optional(),
    settings: z
      .object({
        discoverable: z.boolean().optional(),
        dmPolicy: z.enum([DmPolicy.EVERYONE, DmPolicy.CONTACTS]).optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const searchUsersQuery = z.object({
  q: z.string().trim().min(1).max(50),
});

export const presenceQuery = z.object({
  ids: z
    .string()
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(objectId).min(1).max(100)),
});

export const idParam = z.object({ id: objectId });
export const userIdParam = z.object({ userId: objectId });

/* ---------- contacts ---------- */
export const contactRequestSchema = z.object({ userId: objectId });

/* ---------- conversations ---------- */
export const createDirectSchema = z.object({ userId: objectId });

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(80),
  memberIds: z.array(objectId).min(1, "Add at least one member").max(99),
  coverUrl: httpUrl.optional(),
});

export const channelUrlParam = z.object({
  channelUrl: z.string().min(1).max(200).regex(/^[A-Za-z0-9_\-]+$/, "Invalid channel"),
});

export const addMembersSchema = z.object({
  userIds: z.array(objectId).min(1).max(50),
});

/* ---------- notifications ---------- */
export const listNotificationsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  before: z.iso.datetime().optional(),
});
