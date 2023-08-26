// Functions for managing songs and verses.

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

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
    await ctx.db.insert("songs", { extracted: false, ...args });
  },
});

// Get a batch of verses that don't yet have embeddings.
export const getUnembeddedBatch = internalQuery({
  args: {
    limit: v.float64(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("verses")
      .withIndex("embedding", (q) => q.eq("embedding", undefined))
      .take(args.limit);
    return batch.map((verse) => ({
      id: verse._id,
      text: verse.text.replace(/\n/g, " "), // XXX not sure if replace is needed for OpenAI
    }));
  },
});

// Store embeddings for a batch of verses.
export const addEmbedding = internalMutation({
  args: {
    batch: v.array(
      v.object({ id: v.id("verses"), embedding: v.array(v.float64()) })
    ),
  },
  handler: async (ctx, args) => {
    for (const verse of args.batch) {
      await ctx.db.patch(verse.id, { embedding: verse.embedding });
    }
  },
});

// Split a song into useable verses.
export function splitVerses(lyrics: string) {
  // split verses by a double newline or line that starts and end with square brackets
  // (e.g. [Verse 1] or [Chorus])
  const verses = lyrics.split(/\n\n|^\[.*\]\n/gm);
  // filter out verses that are less than 10 words long
  return verses.filter((verse) => verse.split(" ").length > 10);
}

// Call this function to extract verses out of songs that haven't yet been
// extracted.
export const extractVerses = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("songs")
      .withIndex("extracted", (q) => q.eq("extracted", false))
      .take(100);
    if (batch.length === 0) {
      return;
    }

    const extracted = batch.map((song) => ({
      id: song._id,
      verses: splitVerses(song.lyrics),
    }));

    for (const song of extracted) {
      for (const verse of song.verses) {
        await ctx.db.insert("verses", {
          songId: song.id,
          text: verse,
        });
      }
      console.log("extracted", song.verses.length, "verses from", song.id);
      await ctx.db.patch(song.id, { extracted: true });
    }

    await ctx.scheduler.runAfter(0, internal.songs.extractVerses, {});
  },
});
