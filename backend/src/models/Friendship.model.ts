import { Schema, Types, model } from "mongoose";

export enum FriendshipStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
}

/**
 * One document per pair of users. `pairKey` is the two ids sorted and joined,
 * so a unique index stops duplicate or contradictory records
 * (e.g. A→B pending and B→A pending at the same time).
 * Declined requests are deleted rather than stored.
 */
const friendshipSchema = new Schema(
  {
    pairKey: { type: String, required: true, unique: true },
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: Object.values(FriendshipStatus), default: FriendshipStatus.PENDING },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const makePairKey = (a: string | Types.ObjectId, b: string | Types.ObjectId): string =>
  [String(a), String(b)].sort().join("_");

export const FriendshipModel = model("Friendship", friendshipSchema, "friendships");
