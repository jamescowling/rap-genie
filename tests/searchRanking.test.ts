import { test } from "vitest";
import assert from "node:assert/strict";
import {
  applyRanking,
  diversify,
  fuseRanks,
  keywordQuery,
} from "../convex/searchRanking.ts";

test("agreement between retrieval sources outranks a single-source hit", () => {
  assert.equal(
    fuseRanks([
      ["a", "b"],
      ["c", "b"],
    ])[0].id,
    "b",
  );
  assert.deepEqual(fuseRanks([["a", "a"], []]), fuseRanks([["a"], []]));
  assert.deepEqual(fuseRanks([[], []]), []);
});

test("keyword query respects term limits, punctuation and empty input", () => {
  assert.equal(keywordQuery("Money, MONEY! café"), "money café");
  assert.equal(keywordQuery("?!"), "");
  assert.equal(keywordQuery("x".repeat(40)), "");
  assert.equal(
    keywordQuery(
      Array.from({ length: 30 }, (_, i) => `word${i}`).join(" "),
    ).split(" ").length,
    16,
  );
});

test("reranking only accepts a complete valid permutation", () => {
  assert.deepEqual(applyRanking(["a", "b"], "[1,0]"), ["b", "a"]);
  for (const invalid of [
    "[0,0]",
    "[0]",
    "[0,2]",
    "[0,-1]",
    '[0,"1"]',
    "[0,0.5]",
    "{}",
    "not JSON",
  ]) {
    assert.throws(() => applyRanking(["a", "b"], invalid));
  }
});

test("diversity skips duplicate songs and normalized lyrics and fills from later candidates", () => {
  const items = [
    { songId: "1", verse: "Hello, world!" },
    { songId: "1", verse: "Another verse" },
    { songId: "2", verse: "HELLO world" },
    { songId: "3", verse: "Something else" },
    { songId: "4", verse: "Last verse" },
  ];
  assert.deepEqual(diversify(items, 2), [items[0], items[3]]);
  assert.deepEqual(diversify([], 9), []);
});
