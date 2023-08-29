// Semantic search functions.

import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fetchEmbedding } from "./openai";

// Get the info we want to send to the client for a batch of verses.
export const getVerseInfos = internalQuery({
  args: {
    verseIds: v.array(v.id("verses")),
  },
  handler: async (ctx, { verseIds }) => {
    return await Promise.all(
      verseIds.map(async (verseId) => {
        const verse = await ctx.db.get(verseId);
        // Verse could be missing if it was deleted while the calling action was
        // running, since actions aren't transactional.
        if (!verse) {
          // I wanted to return null here and then use
          // .filter((item) => item !== null);
          // but type inference is failing me.
          return { artist: "", title: "", verse: "", geniusId: 0n };
        }
        const song = await ctx.db.get(verse.songId);
        if (!song) {
          // This shouldn't happen though because queries are transactional.
          throw new Error(
            `Verse ${verseId} has songId ${verse.songId} which does not exist`
          );
        }
        return {
          artist: song.artist,
          title: song.title,
          verse: verse.text,
          geniusId: song.geniusId,
        };
      })
    );
  },
});

// Search for matching verses.
export const search = action({
  args: {
    text: v.string(),
    count: v.float64(),
  },
  handler: async (ctx, { text, count }) => {
    const queryEmbedding = await fetchEmbedding(text);
    const verseIds = await ctx
      .vectorSearch("verses", "embedding", {
        vector: queryEmbedding,
        vectorField: "embedding",
        limit: count,
      })
      .then((results) => results.map((result) => result._id));
    const verseInfos: {
      artist: string;
      title: string;
      verse: string;
      geniusId: bigint;
    }[] = await ctx.runQuery(internal.search.getVerseInfos, {
      verseIds,
    });
    return verseInfos;
  },
});
