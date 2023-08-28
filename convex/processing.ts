// Data processing/generation functions.

import {
  DatabaseWriter,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { fetchEmbeddingBatch } from "./openai";
import { GenericId, v } from "convex/values";
import { GenericDatabaseWriter } from "convex/server";

// Split a song into useable verses.
function splitSong(lyrics: string) {
  const verses = lyrics.split(/\n\n|^\[.*\]\n/gm); // double newline or [brackets line]
  const longVerses = verses.filter((verse) => verse.split(" ").length > 16);
  const trimmedVerses = longVerses.map((verse) => verse.trim());
  const uniqueVerses = [...new Set(trimmedVerses)];
  return uniqueVerses;
}

// Processes a batch of unprocessed songs to generate and store verse
// embeddings.
export const processSongBatch = internalAction({
  args: {
    limit: v.float64(),
    recursive: v.boolean(),
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
      splitSong(song.lyrics).map((verse) => ({
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

    if (args.recursive && batch.length === args.limit) {
      await ctx.scheduler.runAfter(
        0,
        internal.processing.processSongBatch,
        args
      );
    }
  },
});

// Delete all verses for a song and mark it as unprocessed.
async function unprocessSong(db: DatabaseWriter, songId: Id<"songs">) {
  const verseBatch = await db
    .query("verses")
    .withIndex("songId", (q: any) => q.eq("songId", songId))
    .collect();
  await Promise.all(verseBatch.map((verse) => db.delete(verse._id)));
  await db.patch(songId, { processed: false });
}

// Delete batch of verses and mark all songs as unprocessed.
export const unprocessSongBatch = internalMutation({
  args: {
    limit: v.float64(),
    recursive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const songBatch = await ctx.db
      .query("songs")
      .withIndex("processed", (q) => q.eq("processed", true))
      .take(args.limit);
    await Promise.all(songBatch.map((song) => unprocessSong(ctx.db, song._id)));
    if (args.recursive && songBatch.length === args.limit) {
      await ctx.scheduler.runAfter(0, internal.processing.unprocessSongBatch, {
        limit: args.limit,
        recursive: args.recursive,
      });
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
