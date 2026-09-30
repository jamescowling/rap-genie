// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../src/App";

const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("convex/react", () => ({ useAction: () => search }));
let host: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<App />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.resetAllMocks();
});
function button(text: string) {
  return [...host.querySelectorAll("button")].find((node) => node.textContent === text)!;
}

test("shows loading, preserves query, and renders expandable results without match percentages", async () => {
  let resolve!: (value: unknown[]) => void;
  search.mockReturnValue(new Promise((done) => { resolve = done; }));
  await act(async () => button("missing home").click());
  expect(button("Searching…").disabled).toBe(true);
  expect(host.querySelector("input")?.value).toBe("missing home");
  const verse = Array.from({ length: 12 }, (_, i) => `Test lyric line ${i + 1}`).join("\n");
  await act(async () => resolve([{ verseId: "one", artist: "Test artist", title: "Test song", verse, geniusId: 1n }]));
  expect(host.textContent).toContain("Test artist");
  expect(host.textContent).not.toContain("% match");
  expect(host.textContent).not.toContain("Test lyric line 12");
  await act(async () => button("Read full verse").click());
  expect(host.textContent).toContain("Test lyric line 12");
  expect(button("Show less").getAttribute("aria-expanded")).toBe("true");
  await act(async () => button("Show less").click());
  expect(host.textContent).not.toContain("Test lyric line 12");
});

test("errors remain retryable and empty results have a useful message", async () => {
  search.mockRejectedValueOnce(new Error("unavailable"));
  await act(async () => button("missing home").click());
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Please try again");
  expect(button("Find verses").disabled).toBe(false);
  search.mockResolvedValueOnce([]);
  await act(async () => button("Find verses").click());
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(host.textContent).toContain("No verses found");
});
