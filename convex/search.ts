// Semantic search functions.

import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fetchEmbedding } from "./openai";

export const getVerseInfos = internalQuery({
  args: {
    verseIds: v.array(v.id("verses")),
  },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.verseIds.map(async (verseId) => {
        const verse = await ctx.db.get(verseId);
        // XXX search for ! and add error handling
        const song = await ctx.db.get(verse!.songId);
        return {
          artist: song!.artist,
          title: song!.title,
          verse: verse!.text,
          geniusId: song!.geniusId,
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
  handler: async (ctx, args) => {
    const queryEmbedding = await fetchEmbedding(args.text);
    const verseIds = await ctx
      .vectorSearch("verses", "embedding", {
        vector: queryEmbedding,
        vectorField: "embedding",
        limit: args.count,
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
