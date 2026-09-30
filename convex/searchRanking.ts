export function keywordQuery(text: string): string {
  return [
    ...new Set(
      (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
        (term) => term.length <= 32,
      ),
    ),
  ]
    .slice(0, 16)
    .join(" ");
}

export function fuseRanks<T extends string>(
  lists: T[][],
): { id: T; score: number }[] {
  const scores = new Map<T, number>();
  for (const list of lists) {
    [...new Set(list)].forEach((id, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (60 + rank + 1));
    });
  }
  return [...scores]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

// A complete permutation prevents hallucinated or omitted IDs from losing results.
export function applyRanking<T>(candidates: T[], response: string): T[] {
  const order: unknown = JSON.parse(response);
  if (
    !Array.isArray(order) ||
    order.length !== candidates.length ||
    new Set(order).size !== candidates.length ||
    order.some(
      (id) => !Number.isInteger(id) || id < 0 || id >= candidates.length,
    )
  ) {
    throw new Error("Invalid reranker ordering");
  }
  return order.map((id: number) => candidates[id]);
}

export function diversify<T extends { songId: string; verse: string }>(
  items: T[],
  count: number,
): T[] {
  const songs = new Set<string>();
  const texts = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const text = item.verse
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    if (!text || songs.has(item.songId) || texts.has(text)) continue;
    songs.add(item.songId);
    texts.add(text);
    result.push(item);
    if (result.length === count) break;
  }
  return result;
}
