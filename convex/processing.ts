// Data processing/generation functions.

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { fetchEmbeddingBatch } from "./openai";

// Generate embeddings for all verses.
export const generateAllEmbeddings = internalAction({
  args: {},
  handler: async (ctx, args) => {
    const batch: {
      id: Id<"verses">;
      text: string;
    }[] = await ctx.runQuery(internal.songs.getUnembeddedBatch, { limit: 100 });
    if (batch.length === 0) {
      return;
    }

    const verses = batch.map((verse) => verse.text);
    const embeddings = await fetchEmbeddingBatch(verses);

    await ctx.runMutation(internal.songs.addEmbedding, {
      batch: batch.map((verse, i) => ({
        id: verse.id,
        embedding: embeddings[i],
      })),
    });

    console.log("embedded", batch.length, "verses");
    if (batch.length === 100) {
      await ctx.scheduler.runAfter(
        0,
        internal.processing.generateAllEmbeddings,
        {}
      );
    }
  },
});

// Clear all state.
export const clearAll = internalMutation({
  handler: async (ctx) => {
    const limit = 100;
    const songBatch = await ctx.db.query("songs").take(limit);
    await Promise.all(songBatch.map((song) => ctx.db.delete(song._id)));
    const verseBatch = await ctx.db.query("verses").take(limit);
    await Promise.all(verseBatch.map((verse) => ctx.db.delete(verse._id)));
    if (songBatch.length === limit || verseBatch.length === limit) {
      await ctx.scheduler.runAfter(0, internal.processing.clearAll, {});
    }
  },
});
