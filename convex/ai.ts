import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// Fetch a batch of embeddings from OpenAI.
export async function fetchEmbeddingBatch(text: string[]) {
  const result = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    },

    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });
  const jsonresults = await result.json();
  const allembeddings = jsonresults.data as {
    embedding: number[];
    index: number;
  }[];
  allembeddings.sort((a, b) => b.index - a.index);
  return allembeddings.map(({ embedding }) => embedding);
}

// Generate embeddings for all verses.
export const generateAllEmbeddings = action({
  args: {},
  handler: async (ctx, args) => {
    const batch: {
      id: Id<"verses">;
      text: string;
    }[] = await ctx.runQuery(api.songs.getUnembeddedBatch, { limit: 100 });
    if (batch.length === 0) {
      return;
    }

    const verses = batch.map((verse) => verse.text);
    const embeddings = await fetchEmbeddingBatch(verses);

    await ctx.runMutation(api.songs.addEmbedding, {
      batch: batch.map((verse, i) => ({
        id: verse.id,
        embedding: embeddings[i],
      })),
    });

    console.log("embedded", batch.length, "verses");
    if (batch.length === 100) {
      await ctx.scheduler.runAfter(0, api.ai.generateAllEmbeddings, {});
    }
  },
});

// Compare two vectors by doing a dot product.
// returns [-1, 1] based on similarity. (1 is the same, -1 is the opposite)
export function compare(vectorA: number[], vectorB: number[] | undefined) {
  if (vectorB === undefined) {
    return -1;
  }
  return vectorA.reduce((sum, val, idx) => sum + val * vectorB[idx], 0);
}

export const hackyRank = query({
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

export const search = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const embedding = (await fetchEmbeddingBatch([args.text]))[0];
    const rankings: { artist: string; title: string; verse: string }[] =
      await ctx.runQuery(api.ai.hackyRank, {
        embedding,
        count: 3,
      });
    return rankings;
  },
});
