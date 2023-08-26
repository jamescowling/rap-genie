import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const add = mutation({
  args: {
    genre: v.string(),
    artist: v.string(),
    title: v.string(),
    year: v.int64(),
    lyrics: v.string(),
    popularity: v.int64(),
    features: v.string(),
    geniusId: v.int64(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("songs", args);
  },
});

export const getUnembeddedBatch = query({
  args: {
    limit: v.float64(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("songs")
      .withIndex("embedding", (q) => q.eq("embedding", undefined))
      .take(args.limit);
    return batch.map((song) => ({
      id: song._id,
      lyrics: song.lyrics.replace(/\n/g, " "), // not sure if replace is needed for OpenAI
    }));
  },
});

export const addEmbedding = mutation({
  args: {
    batch: v.array(
      v.object({ id: v.id("songs"), embedding: v.array(v.float64()) })
    ),
  },
  handler: async (ctx, args) => {
    for (const song of args.batch) {
      await ctx.db.patch(song.id, { embedding: song.embedding });
    }
  },
});

export const deleteAll = internalMutation({
  handler: async (ctx) => {
    const limit = 100;
    const batch = await ctx.db.query("songs").take(limit);
    await Promise.all(batch.map((song) => ctx.db.delete(song._id)));
    if (batch.length === limit) {
      await ctx.scheduler.runAfter(0, internal.songs.deleteAll, {});
    }
  },
});
