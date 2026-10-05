import { describe, expect, it, vi } from "vitest";
import type { Entry } from "@/features/hacker-news/get-entries/entry";
import { countWords } from "@/features/hacker-news/get-entries/count-words";
import { SnapshotCache } from "@/features/hacker-news/get-entries/cache/snapshot-cache";

const entries: Entry[] = [
  { rank: 1, title: "Zulu short", points: 10, comments: 100 },
  { rank: 2, title: "Beta long title has six words", points: 100, comments: 8 },
  { rank: 3, title: "Alpha short", points: 10, comments: 1 },
  { rank: 4, title: "Alpha long title has six words", points: 1, comments: 8 },
  { rank: 5, title: "Most popular", points: 20, comments: 0 },
  {
    rank: 6,
    title: "Most discussed long title has six words",
    points: 0,
    comments: 20,
  },
];

describe("SnapshotCache", () => {
  it("starts without a snapshot", () => {
    expect(new SnapshotCache().get()).toBeNull();
  });

  it("publishes only counted entries and their collection time", () => {
    const cache = new SnapshotCache();
    cache.replace(entries, 1_000);
    const snapshot = cache.get()!;
    expect(snapshot.collectedAt).toBe(1_000);
    expect(snapshot.entries.map((entry) => entry.wordCount)).toEqual([
      2, 6, 2, 6, 2, 7,
    ]);
    expect(snapshot).toEqual({
      collectedAt: 1_000,
      entries: entries.map((entry) => ({
        ...entry,
        wordCount: countWords(entry.title),
      })),
    });
  });

  it("keeps the prior snapshot when preparation fails midway", () => {
    const count = vi.fn(countWords);
    const cache = new SnapshotCache(count);
    cache.replace(entries, 1_000);
    const previous = cache.get();
    count.mockImplementation((title) => {
      if (title === "Broken title") throw new Error("Cannot count");
      return countWords(title);
    });
    const replacement = [
      { ...entries[0], title: "New title" },
      { ...entries[1], title: "Broken title" },
    ];
    expect(() => cache.replace(replacement, 2_000)).toThrow("Cannot count");
    expect(cache.get()).toBe(previous);
    expect(cache.get()?.collectedAt).toBe(1_000);
  });

  it("publishes a new snapshot without changing a previously read one", () => {
    const cache = new SnapshotCache();
    cache.replace(entries, 1_000);
    const previous = cache.get()!;
    cache.replace([{ ...entries[0], points: 99 }], 2_000);
    expect(cache.get()).not.toBe(previous);
    expect(cache.get()?.entries[0].points).toBe(99);
    expect(previous.entries[0].points).toBe(10);
    expect(previous.collectedAt).toBe(1_000);
  });

  it("copies input entries and protects the published snapshot from mutation", () => {
    const cache = new SnapshotCache();
    const input = entries.map((entry) => ({ ...entry }));
    cache.replace(input, 1_000);
    input[0].title = "Changed";
    input.pop();
    const snapshot = cache.get()!;
    expect(snapshot.entries).toHaveLength(6);
    expect(snapshot.entries[0].title).toBe("Zulu short");
    expect(Reflect.set(snapshot.entries[0], "points", 999)).toBe(false);
    expect(snapshot.entries[0].points).toBe(10);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
  });

  it("supports an empty snapshot", () => {
    const cache = new SnapshotCache();
    cache.replace([], 1_000);
    expect(cache.get()).toEqual({
      collectedAt: 1_000,
      entries: [],
    });
  });
});
