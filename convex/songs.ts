// Functions for processing songs and verses.

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { DatabaseWriter, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { EMBEDDING_MODEL, fetchEmbeddingBatch } from "./openai";

// Legacy rows have no model tag. A bounded batch makes this safe to restart.
export const legacyVerseBatch = internalQuery({
  args: {},
  returns: v.array(v.object({ id: v.id("verses"), text: v.string() })),
  handler: async (ctx) => {
    const verses = await ctx.db
      .query("verses")
      .withIndex("embeddingModel", (q) => q.eq("embeddingModel", undefined))
      .take(128);
    return verses.map((verse) => ({ id: verse._id, text: verse.text }));
  },
});

export const storeReembeddedVerses = internalMutation({
  args: {
    verses: v.array(
      v.object({
        id: v.id("verses"),
        text: v.string(),
        embedding: v.array(v.float64()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { verses }) => {
    for (const verse of verses) {
      if (
        verse.embedding.length !== 1536 ||
        verse.embedding.some((n) => !Number.isFinite(n))
      ) {
        throw new Error("Invalid embedding");
      }
      const current = await ctx.db.get(verse.id);
      if (
        current &&
        current.embeddingModel === undefined &&
        current.text === verse.text
      ) {
        await ctx.db.patch(verse.id, {
          embedding: verse.embedding,
          embeddingModel: EMBEDDING_MODEL,
        });
      }
    }
    return null;
  },
});

// Run manually after deploy. Failures stop the chain; rerunning skips completed rows.
export const reembedVerses = internalAction({
  args: { recursive: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { recursive }) => {
    const verses: { id: Id<"verses">; text: string }[] = await ctx.runQuery(
      internal.songs.legacyVerseBatch,
      {},
    );
    if (!verses.length) return null;
    const embeddings = await fetchEmbeddingBatch(
      verses.map((verse) => verse.text),
    );
    await ctx.runMutation(internal.songs.storeReembeddedVerses, {
      verses: verses.map((verse, index) => ({
        ...verse,
        embedding: embeddings[index],
      })),
    });
    if (recursive) {
      await ctx.scheduler.runAfter(250, internal.songs.reembedVerses, {
        recursive: true,
      });
    }
    return null;
  },
});

// Add a batch of songs.
export const addBatch = mutation({
  args: {
    batch: v.array(
      v.object({
        genre: v.string(),
        artist: v.string(),
        title: v.string(),
        year: v.int64(),
        lyrics: v.string(),
        features: v.string(),
        geniusViews: v.int64(),
        geniusId: v.int64(),
      }),
    ),
  },
  handler: async (ctx, { batch }) => {
    await Promise.all(
      batch.map(async (song) => {
        const existing = await ctx.db
          .query("songs")
          .withIndex("geniusId", (q) => q.eq("geniusId", song.geniusId))
          .unique();
        if (!existing) {
          await ctx.db.insert("songs", { processed: false, ...song });
        }
      }),
    );
    console.log(`Added ${batch.length} songs`);
  },
});

// Get a batch of songs that haven't been processed yet, i.e., their verses
// haven't been extracted with embeddings.
export const getUnprocessedBatch = internalQuery({
  args: {
    limit: v.float64(),
    minViews: v.int64(),
  },
  handler: async (ctx, { limit, minViews }) => {
    const batch = await ctx.db
      .query("songs")
      .withIndex("processed", (q) =>
        q.eq("processed", false).gte("geniusViews", minViews),
      )
      .take(limit);
    return batch.map((song) => ({
      id: song._id,
      lyrics: song.lyrics,
    }));
  },
});

// Return some kind of prefix for a verse that can be used to remove duplicates.
function versePrefix(verse: string) {
  return verse
    .toLowerCase()
    .replace(/[^\w\s]|_/g, "") // eliminate punctuation
    .split(" ")
    .slice(0, 16)
    .join(" ");
}

// Split a song into useable verses.
function splitSong(lyrics: string) {
  const verses = lyrics.split(/\n\n|^\[.*\]\n/gm); // double newline or [brackets line]
  const longVerses = verses.filter((verse) => verse.split(" ").length > 16);
  const trimmedVerses = longVerses.map((verse) => verse.trim());

  // Exclude any verses that have the same prefix as a previous verse.
  const addedPrefixes = new Set();
  const uniqueVerses = trimmedVerses.filter((verse) => {
    const prefix = versePrefix(verse);
    if (!addedPrefixes.has(prefix)) {
      addedPrefixes.add(prefix);
      return true;
    }
    return false;
  });
  return uniqueVerses;
}

// Store embeddings for a batch of verses and mark the song as processed.
export const storeProcessedBatch = internalMutation({
  args: {
    batch: v.array(
      v.object({
        songId: v.id("songs"),
        verses: v.array(
          v.object({
            songId: v.id("songs"),
            text: v.string(),
            embedding: v.array(v.float64()),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, { batch }) => {
    for (const song of batch) {
      for (const verse of song.verses) {
        await ctx.db.insert("verses", {
          ...verse,
          embeddingModel: EMBEDDING_MODEL,
        });
      }
      await ctx.db.patch(song.songId, { processed: true });
    }
  },
});

// Processes a batch of unprocessed songs to generate and store verse
// embeddings.
//
// Suggested args:
//  limit: 20
//  recursive: true
//  minViews: 100000n
export const processSongBatch = internalAction({
  args: {
    limit: v.float64(),
    recursive: v.boolean(),
    minViews: v.int64(),
  },
  handler: async (ctx, args) => {
    // Fetch batch of songs that haven't been processed yet.
    const batch = await ctx.runQuery(internal.songs.getUnprocessedBatch, {
      limit: args.limit,
      minViews: args.minViews,
    });

    if (!batch.length) {
      console.log("No more songs to process");
      return;
    }

    // Split each song out into verses and compute embeddings.
    const verses = batch.flatMap((song) =>
      splitSong(song.lyrics).map((verse) => ({
        songId: song.id,
        text: verse,
      })),
    );
    const embeddings = await fetchEmbeddingBatch(verses.map((v) => v.text));

    // Combine embeddings and verses with song ids.
    const versesWithEmbeddings = verses.map((verse, i) => ({
      ...verse,
      embedding: embeddings[i],
    }));
    const songsWithVerses = batch.map((song) => ({
      songId: song.id,
      verses: versesWithEmbeddings.filter((verse) => verse.songId === song.id),
    }));

    // Insert all verses into the database and mark each song as processed.
    await ctx.runMutation(internal.songs.storeProcessedBatch, {
      batch: songsWithVerses,
    });
    console.log(`Processed ${batch.length} songs`);

    if (args.recursive) {
      console.log("Scheduling another batch");
      await ctx.scheduler.runAfter(0, internal.songs.processSongBatch, args);
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
  handler: async (ctx, { limit, recursive }) => {
    const songBatch = await ctx.db
      .query("songs")
      .withIndex("processed", (q) => q.eq("processed", true))
      .take(limit);
    await Promise.all(songBatch.map((song) => unprocessSong(ctx.db, song._id)));
    console.log(`Unprocessed ${songBatch.length} songs`);
    if (recursive && songBatch.length === limit) {
      console.log("Scheduling another batch");
      await ctx.scheduler.runAfter(0, internal.songs.unprocessSongBatch, {
        limit,
        recursive,
      });
    }
  },
});

// Clear all state.
export const clearAll = internalMutation({
  handler: async (ctx) => {
    const limit = 100;
    const songBatch = await ctx.db.query("songs").take(limit);
    await Promise.all(songBatch.map((song) => unprocessSong(ctx.db, song._id)));
    await Promise.all(songBatch.map((song) => ctx.db.delete(song._id)));
    console.log(`Deleted ${songBatch.length} songs`);
    if (songBatch.length === limit) {
      console.log("Scheduling another batch");
      await ctx.scheduler.runAfter(0, internal.songs.clearAll, {});
    }
  },
});
