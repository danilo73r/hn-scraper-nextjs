import { describe, expect, it, vi } from "vitest";
import { SnapshotCache } from "@/features/hacker-news/get-entries/cache/snapshot-cache";
import { countWords } from "@/features/hacker-news/get-entries/count-words";
import type { Entry } from "@/features/hacker-news/get-entries/entry";

function entry(title: string, points = 1): Entry {
  return { rank: 1, title, points, comments: 0 };
}

describe("SnapshotCache word count reuse", () => {
  it("reuses counts for unchanged titles while updating their metrics", () => {
    const count = vi.fn(countWords);
    const cache = new SnapshotCache(count);
    cache.replace([entry("Shared title"), entry("Removed title")], 1_000);
    count.mockClear();
    cache.replace([entry("Shared title", 99), entry("New title")], 2_000);

    expect(count.mock.calls).toEqual([["New title"]]);
    expect(cache.get()?.entries[0]).toMatchObject({ points: 99, wordCount: 2 });
  });

  it("counts repeated titles once within the same snapshot", () => {
    const count = vi.fn(countWords);
    const cache = new SnapshotCache(count);
    cache.replace([entry("Repeated title"), entry("Repeated title", 5)]);

    expect(count).toHaveBeenCalledTimes(1);
    expect(cache.get()?.entries).toHaveLength(2);
    expect(cache.get()?.entries.map((entry) => entry.wordCount)).toEqual([
      2, 2,
    ]);
  });

  it("reuses zero counts", () => {
    const count = vi.fn(countWords);
    const cache = new SnapshotCache(count);
    cache.replace([entry("---"), entry("---")]);
    cache.replace([entry("---")]);

    expect(count).toHaveBeenCalledTimes(1);
    expect(cache.get()?.entries[0].wordCount).toBe(0);
  });

  it("discards counts for titles absent from the latest snapshot", () => {
    const count = vi.fn(countWords);
    const cache = new SnapshotCache(count);
    cache.replace([entry("Old title")]);
    cache.replace([entry("Current title")]);
    count.mockClear();
    cache.replace([entry("Old title"), entry("Current title")]);

    expect(count.mock.calls).toEqual([["Old title"]]);
  });

  it("clears the count dictionary when replacing with an empty snapshot", () => {
    const count = vi.fn(countWords);
    const cache = new SnapshotCache(count);
    cache.replace([entry("Old title")]);
    cache.replace([]);
    count.mockClear();
    cache.replace([entry("Old title")]);

    expect(count.mock.calls).toEqual([["Old title"]]);
  });

  it("keeps the previous dictionary and discards partial counts after a failure", () => {
    const count = vi.fn(countWords);
    const cache = new SnapshotCache(count);
    cache.replace([entry("Shared title")]);
    const previous = cache.get();
    count.mockImplementation((title) => {
      if (title === "Broken title") throw new Error("Cannot count");
      return countWords(title);
    });
    expect(() =>
      cache.replace([entry("Partial title"), entry("Broken title")]),
    ).toThrow("Cannot count");
    expect(cache.get()).toBe(previous);
    count.mockImplementation(countWords).mockClear();
    cache.replace([entry("Shared title"), entry("Partial title")]);

    expect(count.mock.calls).toEqual([["Partial title"]]);
  });
});
