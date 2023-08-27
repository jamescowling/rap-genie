// Functions for managing songs and verses.

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

// Add a song.
export const add = mutation({
  args: {
    genre: v.string(),
    artist: v.string(),
    title: v.string(),
    year: v.int64(),
    lyrics: v.string(),
    features: v.string(),
    geniusViews: v.int64(),
    geniusId: v.int64(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("songs", { processed: false, ...args });
  },
});

// Get a batch of songs that haven't been processed yet, i.e., their verses
// haven't been extracted with embeddings.
export const getUnprocessedBatch = internalQuery({
  args: {
    limit: v.float64(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("songs")
      .withIndex("processed", (q) => q.eq("processed", false))
      .take(args.limit);
    return batch.map((song) => ({
      id: song._id,
      lyrics: song.lyrics,
    }));
  },
});

// Store embeddings for a batch of verses and mark the song as processed.
export const addVersesAndMarkProcessed = internalMutation({
  args: {
    batch: v.array(
      v.object({
        songId: v.id("songs"),
        text: v.string(),
        embedding: v.array(v.float64()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const verse of args.batch) {
      await ctx.db.insert("verses", verse);
      // We run this too many times but that's ok.
      await ctx.db.patch(verse.songId, { processed: true });
    }
  },
});
