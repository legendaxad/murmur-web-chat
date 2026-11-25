import { Schema, model } from "mongoose";

/**
 * Directional block (A blocks B). Kept separate from Friendship because
 * friendships are symmetric and blocks are one-directional. Mirrored to
 * Sendbird's block API so the chat service also hides the blocked user's messages.
 */
const blockSchema = new Schema(
  {
    blocker: { type: Schema.Types.ObjectId, ref: "User", required: true },
    blocked: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1 });

export const BlockModel = model("Block", blockSchema, "blocks");
