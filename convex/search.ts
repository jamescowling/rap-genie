// Semantic search functions.

import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fetchEmbedding } from "./openai";
import { Id } from "./_generated/dataModel";

// Get the info we want to send to the client for a batch of verses.
export const getVerseInfos = internalQuery({
  args: {
    verseIds: v.array(v.id("verses")),
  },
  handler: async (ctx, { verseIds }) => {
    const verseInfos = await Promise.all(
      verseIds.map(async (verseId) => {
        const verse = await ctx.db.get(verseId);
        // Verse could be missing if it was deleted while the calling action was
        // running, since actions aren't transactional.
        if (!verse) {
          return null;
        }
        const song = await ctx.db.get(verse.songId);
        if (!song) {
          // This shouldn't happen though because queries are transactional.
          throw new Error(
            `Verse ${verseId} has songId ${verse.songId} which does not exist`
          );
        }
        return {
          verseId: verse._id,
          artist: song.artist,
          title: song.title,
          verse: verse.text,
          geniusId: song.geniusId,
        };
      })
    );
    // The extraneous map operation just reassures typescript that there really
    // aren't any nulls left. I promise typescript, there aren't. Just look at
    // that little filter operation. It's filtering so good! You can trust it.
    return verseInfos.filter((item) => item !== null).map((item) => item!);
  },
});

// Search for matching verses.
export const search = action({
  args: {
    text: v.string(),
    count: v.float64(),
  },
  handler: async (ctx, { text, count }) => {
    console.log(`Searching for "${text}"`);
    const queryEmbedding = await fetchEmbedding(text);
    const startTime = Date.now();
    const matches = await ctx.vectorSearch("verses", "embedding", {
      vector: queryEmbedding,
      limit: count,
    });
    console.log(
      `Found ${matches.length} matches in ${Date.now() - startTime} ms`
    );
    const verseIds = matches.map((match) => match._id);
    const verseInfos: {
      verseId: Id<"verses">;
      artist: string;
      title: string;
      verse: string;
      geniusId: bigint;
    }[] = await ctx.runQuery(internal.search.getVerseInfos, {
      verseIds,
    });
    const scoredVerses = verseInfos.map((verseInfo, index) => {
      return { ...verseInfo, score: matches[index]._score };
    });
    return scoredVerses;
  },
});
