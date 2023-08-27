// Data processing/generation functions.

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { fetchEmbeddingBatch } from "./openai";
import { v } from "convex/values";

// Split a song into useable verses.
export function splitVerses(lyrics: string) {
  // Split verses by a double newline or line that starts and end with square
  // brackets.
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
  },
  handler: async (ctx, args) => {
    // Fetch batch of songs that haven't been processed yet.
    const batch: {
      id: Id<"songs">;
      lyrics: string;
    }[] = await ctx.runQuery(internal.songs.getUnprocessedBatch, {
      limit: args.limit,
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
