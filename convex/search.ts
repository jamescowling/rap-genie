import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError, type Infer } from "convex/values";
import { EMBEDDING_MODEL, fetchEmbedding } from "./openai";

const verseInfo = v.object({
  verseId: v.id("verses"),
  artist: v.string(),
  title: v.string(),
  verse: v.string(),
  geniusId: v.int64(),
});

export const getVerseInfos = internalQuery({
  args: { verseIds: v.array(v.id("verses")) },
  returns: v.array(verseInfo),
  handler: async (ctx, { verseIds }) => {
    const infos = await Promise.all(
      verseIds.map(async (verseId) => {
        const verse = await ctx.db.get(verseId);
        if (!verse || verse.embeddingModel !== EMBEDDING_MODEL) return null;
        const song = await ctx.db.get(verse.songId);
        if (!song) return null;
        return {
          verseId: verse._id,
          artist: song.artist,
          title: song.title,
          verse: verse.text,
          geniusId: song.geniusId,
        };
      }),
    );
    return infos.filter((info) => info !== null);
  },
});

export const search = action({
  args: { text: v.string(), count: v.float64() },
  returns: v.array(verseInfo),
  handler: async (ctx, { text, count }): Promise<Infer<typeof verseInfo>[]> => {
    text = text.trim();
    if (
      !text ||
      text.length > 1000 ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 20
    ) {
      throw new ConvexError(
        "Enter 1–1000 characters and request 1–20 results.",
      );
    }
    const matches = await ctx.vectorSearch("verses", "embedding", {
      vector: await fetchEmbedding(text),
      limit: count,
      filter: (q) => q.eq("embeddingModel", EMBEDDING_MODEL),
    });
    return ctx.runQuery(internal.search.getVerseInfos, {
      verseIds: matches.map((match) => match._id),
    });
  },
});
