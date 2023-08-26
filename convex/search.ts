// Semantic search functions.

import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fetchEmbedding } from "./openai";

// Compare two vectors by doing a dot product.
// returns [-1, 1] based on similarity. (1 is the same, -1 is the opposite)
export function compare(vectorA: number[], vectorB: number[] | undefined) {
  if (vectorB === undefined) {
    return -1;
  }
  return vectorA.reduce((sum, val, idx) => sum + val * vectorB[idx], 0);
}

// Will replace this with Convex vector search.
export const hackyRank = internalQuery({
  args: {
    embedding: v.array(v.float64()),
    count: v.float64(),
  },
  handler: async (ctx, args) => {
    // XXX fetch all verses instead
    const verses = await ctx.db.query("verses").take(100);
    const scored = await Promise.all(
      verses.map(async (verse) => {
        const score = compare(args.embedding, verse.embedding);
        return {
          score,
          songId: verse.songId,
          text: verse.text,
        };
      })
    );
    const topRanked = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, args.count);
    const verseInfos = await Promise.all(
      topRanked.map(async (verse) => {
        const song = await ctx.db.get(verse.songId);
        return {
          artist: song!.artist,
          title: song!.title,
          verse: verse.text,
        };
      })
    );
    return verseInfos;
  },
});

// Search for matching verses.
export const search = action({
  args: {
    text: v.string(),
    count: v.float64(),
  },
  handler: async (ctx, args) => {
    const embedding = await fetchEmbedding(args.text);
    const rankings: { artist: string; title: string; verse: string }[] =
      await ctx.runQuery(internal.search.hackyRank, {
        embedding,
        count: args.count,
      });
    return rankings;
  },
});
