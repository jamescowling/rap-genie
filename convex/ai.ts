import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

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

export const embed = action({
  args: {},
  handler: async (ctx, args) => {
    const batch: {
      id: Id<"songs">;
      lyrics: string;
    }[] = await ctx.runQuery(api.songs.getUnembeddedBatch, { limit: 100 });
    if (batch.length === 0) {
      return;
    }

    const lyrics = batch.map((song) => song.lyrics);
    const embeddings = await fetchEmbeddingBatch(lyrics);

    await ctx.runMutation(api.songs.addEmbedding, {
      batch: batch.map((song, i) => ({
        id: song.id,
        embedding: embeddings[i],
      })),
    });

    console.log("embedded", batch.length, "songs");
    if (batch.length === 100) {
      await ctx.scheduler.runAfter(0, api.ai.embed, {});
    }
  },
});

/**
 * Compares two vectors by doing a dot product.
 *
 * Assuming both vectors are normalized to length 1, it will be in [-1, 1].
 * @returns [-1, 1] based on similarity. (1 is the same, -1 is the opposite)
 */
export function compare(vectorA: number[], vectorB: number[] | undefined) {
  if (vectorB === undefined) {
    return -1;
  }
  return vectorA.reduce((sum, val, idx) => sum + val * vectorB[idx], 0);
}

export const hackyRank = query({
  args: {
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const songs = await ctx.db.query("songs").take(10);
    const scores = await Promise.all(
      songs.map(async (song) => {
        const score = compare(args.embedding, song.embedding);
        return {
          score,
          artist: song.artist,
          title: song.title,
          lyrics: song.lyrics,
        };
      })
    );
    return scores.sort((a, b) => b.score - a.score);
  },
});

export const search = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const embedding = (await fetchEmbeddingBatch([args.text]))[0];
    const rankings = await ctx.runQuery(api.ai.hackyRank, { embedding });
    const top: {
      score: number;
      artist: string;
      title: string;
      lyrics: string;
    } = rankings[0];
    return top;
  },
});
