// Data processing/generation functions.

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { fetchEmbeddingBatch } from "./openai";
import { v } from "convex/values";

// Split a song into useable verses.
export function splitVerses(lyrics: string) {
  // Split by double newline or [brackets line].
  const verses = lyrics.split(/\n\n|^\[.*\]\n/gm);
  // Filter out verses that are less than 10 words long.
  return verses.filter((verse) => verse.split(" ").length > 10);
}

// Processes a batch of unprocessed songs to generate and store verse
// embeddings.
export const processSongBatch = internalAction({
  args: {
    limit: v.float64(),
    recurse: v.boolean(),
    minViews: v.int64(),
  },
  handler: async (ctx, args) => {
    // Fetch batch of songs that haven't been processed yet.
    const batch: {
      id: Id<"songs">;
      lyrics: string;
    }[] = await ctx.runQuery(internal.songs.getUnprocessedBatch, {
      limit: args.limit,
      minViews: args.minViews,
    });
    if (!batch.length) {
      console.log("no more songs to process");
      return;
    }

    // Split each song out into verses and compute embeddings.
    const verses = batch.flatMap((song) =>
      splitVerses(song.lyrics).map((verse) => ({
        songId: song.id,
        text: verse,
      }))
    );
    const embeddings = await fetchEmbeddingBatch(verses.map((v) => v.text));
    const versesWithEmbeddings = verses.map((verse, i) => ({
      ...verse,
      embedding: embeddings[i],
    }));

    // Insert all verses into the database and mark each song as processed.
    await ctx.runMutation(internal.songs.addVersesAndMarkProcessed, {
      batch: versesWithEmbeddings,
    });
    console.log("processed", batch.length, "songs");

    if (args.recurse) {
      await ctx.scheduler.runAfter(
        0,
        internal.processing.processSongBatch,
        args
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

// Delete all verses and mark all songs as unprocessed.
// XXX this code could be way better and transactionall process one song at a time
export const clearVerses = internalMutation({
  handler: async (ctx) => {
    const limit = 100;
    const verseBatch = await ctx.db.query("verses").take(limit);
    await Promise.all(verseBatch.map((verse) => ctx.db.delete(verse._id)));
    const songBatch = await ctx.db
      .query("songs")
      .withIndex("processed", (q) => q.eq("processed", true))
      .take(limit);
    await Promise.all(
      songBatch.map((song) =>
        ctx.db.patch(song._id, {
          processed: false,
        })
      )
    );
    if (songBatch.length === limit || verseBatch.length === limit) {
      await ctx.scheduler.runAfter(0, internal.processing.clearVerses, {});
    }
  },
});
