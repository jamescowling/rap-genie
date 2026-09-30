import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  EMBEDDING_MODEL,
  fetchEmbedding,
  fetchEmbeddingBatch,
} from "../convex/openai";

vi.mock("../convex/openai", () => ({
  EMBEDDING_MODEL: "openai/text-embedding-3-small",
  fetchEmbedding: vi.fn(),
  fetchEmbeddingBatch: vi.fn(),
}));
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const vector = (index: number) =>
  Array.from({ length: 1536 }, (_, i) => (i === index ? 1 : 0));
beforeEach(() => {
  vi.mocked(fetchEmbedding).mockResolvedValue(vector(0));
});
afterEach(() => {
  vi.resetAllMocks();
});

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const songId = await ctx.db.insert("songs", {
      genre: "rap",
      artist: "Test artist",
      title: "Test song",
      year: 2020n,
      lyrics: "",
      features: "",
      geniusViews: 1n,
      geniusId: 1n,
      processed: true,
    });
    const legacy = await ctx.db.insert("verses", {
      songId,
      text: "An old verse",
      embedding: vector(0),
    });
    const current = await ctx.db.insert("verses", {
      songId,
      text: "A new verse",
      embedding: vector(1),
      embeddingModel: EMBEDDING_MODEL,
    });
    return { legacy, current };
  });
  return { t, ...ids };
}

test("search excludes legacy vectors even when they are closer and returns no score", async () => {
  const { t, current } = await fixture();
  const results = await t.action(api.search.search, {
    text: "a mood",
    count: 9,
  });
  expect(results.map((r) => r.verseId)).toEqual([current]);
  expect(results[0]).not.toHaveProperty("score");
});

test("hydration skips deleted and legacy verses without reordering survivors", async () => {
  const { t, legacy, current } = await fixture();
  const results = await t.query(internal.search.getVerseInfos, {
    verseIds: [legacy, current],
  });
  expect(results.map((r) => r.verseId)).toEqual([current]);
  await t.run(async (ctx) => ctx.db.delete(current));
  expect(
    await t.query(internal.search.getVerseInfos, { verseIds: [current] }),
  ).toEqual([]);
});

test("re-embedding updates legacy rows once and can be resumed", async () => {
  const { t, legacy } = await fixture();
  vi.mocked(fetchEmbeddingBatch).mockResolvedValue([vector(0)]);
  await t.action(internal.songs.reembedVerses, {});
  expect(await t.query(internal.songs.legacyVerseBatch, {})).toEqual([]);
  expect((await t.run(async (ctx) => ctx.db.get(legacy)))?.embeddingModel).toBe(
    EMBEDDING_MODEL,
  );
  await t.action(internal.songs.reembedVerses, {});
  expect(fetchEmbeddingBatch).toHaveBeenCalledTimes(1);
});

test("failed embedding calls leave legacy data untouched", async () => {
  const { t } = await fixture();
  vi.mocked(fetchEmbeddingBatch).mockRejectedValue(
    new Error("gateway unavailable"),
  );
  await expect(t.action(internal.songs.reembedVerses, {})).rejects.toThrow();
  expect(await t.query(internal.songs.legacyVerseBatch, {})).toHaveLength(1);
});

test("migration never applies a vector to text changed during the model call", async () => {
  const { t, legacy } = await fixture();
  await t.run(async (ctx) => ctx.db.patch(legacy, { text: "Changed verse" }));
  await t.mutation(internal.songs.storeReembeddedVerses, {
    verses: [{ id: legacy, text: "An old verse", embedding: vector(0) }],
  });
  expect(
    (await t.run(async (ctx) => ctx.db.get(legacy)))?.embeddingModel,
  ).toBeUndefined();
});

test("invalid requests fail before calling the gateway", async () => {
  const { t } = await fixture();
  for (const args of [
    { text: " ", count: 9 },
    { text: "x".repeat(1001), count: 9 },
    { text: "topic", count: 0 },
    { text: "topic", count: 1.5 },
    { text: "topic", count: 21 },
  ]) {
    await expect(t.action(api.search.search, args)).rejects.toThrow();
  }
  expect(fetchEmbedding).not.toHaveBeenCalled();
});
