import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { fetchEmbedding } from "../convex/openai";
import { generateText } from "ai";

vi.mock("../convex/openai", () => ({ fetchEmbedding: vi.fn() }));
vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@convex-dev/ai-sdk-provider", () => ({
  convexGateway: vi.fn(() => "test-model"),
}));

const modules = import.meta.glob("../convex/**/*.{ts,js}");
const vector = (index: number) =>
  Array.from({ length: 1536 }, (_, i) => (i === index ? 1 : 0));

beforeEach(() => {
  vi.mocked(fetchEmbedding).mockResolvedValue(vector(0));
  vi.stubEnv("SEARCH_RERANK_ENABLED", "false");
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const song = async (n: number) =>
      ctx.db.insert("songs", {
        genre: "rap",
        artist: `Artist ${n}`,
        title: `Song ${n}`,
        year: 2020n,
        lyrics: "",
        features: "",
        geniusViews: 1n,
        geniusId: BigInt(n),
        processed: true,
      });
    const a = await song(1);
    const b = await song(2);
    const first = await ctx.db.insert("verses", {
      songId: a,
      text: "A quiet evening remembering the old neighborhood",
      embedding: vector(0),
    });
    const second = await ctx.db.insert("verses", {
      songId: b,
      text: "Motorcycles racing down the open road",
      embedding: vector(1),
    });
    return { first, second };
  });
  return { t, ...ids };
}

test("hybrid search returns unique hydrated results without re-embedding the corpus", async () => {
  const { t, first, second } = await fixture();
  const results = await t.action(api.search.search, {
    text: "motorcycles",
    count: 9,
  });
  expect(new Set(results.map((r) => r.verseId))).toEqual(
    new Set([first, second]),
  );
  expect(
    results.every((r) => Number.isFinite(r.score) && r.artist && r.title),
  ).toBe(true);
  expect(generateText).not.toHaveBeenCalled();
});

test("embedding outage still returns keyword matches", async () => {
  const { t, second } = await fixture();
  vi.mocked(fetchEmbedding).mockRejectedValue(new Error("gateway unavailable"));
  const results = await t.action(api.search.search, {
    text: "motorcycles",
    count: 9,
  });
  expect(results.map((r) => r.verseId)).toEqual([second]);
});

test("missing verses are omitted during hydration", async () => {
  const { t, first, second } = await fixture();
  await t.run(async (ctx) => ctx.db.delete(first));
  const results = await t.query(internal.search.getVerseInfos, {
    verseIds: [first, second],
  });
  expect(results.map((r) => r.verseId)).toEqual([second]);
});

test("valid reranking changes order; invalid output and model failures preserve it", async () => {
  const { t } = await fixture();
  const baseline = await t.action(api.search.search, {
    text: "motorcycles",
    count: 9,
  });
  vi.stubEnv("SEARCH_RERANK_ENABLED", "true");
  vi.mocked(generateText).mockResolvedValue({ text: "[1,0]" } as never);
  const ranked = await t.action(api.search.search, {
    text: "motorcycles",
    count: 9,
  });
  expect(ranked).toEqual([...baseline].reverse());
  vi.mocked(generateText).mockResolvedValue({ text: "[999,0]" } as never);
  expect(
    await t.action(api.search.search, { text: "motorcycles", count: 9 }),
  ).toEqual(baseline);
  vi.mocked(generateText).mockRejectedValue(new Error("timeout"));
  expect(
    await t.action(api.search.search, { text: "motorcycles", count: 9 }),
  ).toEqual(baseline);
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
