import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntriesQuery } from "@/features/hacker-news/get-entries/entries-query";
import { EntryFilter } from "@/features/hacker-news/get-entries/entry-filter";
import { SnapshotCache } from "@/features/hacker-news/get-entries/cache/snapshot-cache";
import type { CachedResult } from "@/features/hacker-news/get-entries/cache/cached-entries";
import { ScrapingParseError } from "@/features/hacker-news/get-entries/scraping/scraping-parse-error";

const cache = new SnapshotCache();
cache.replace([{ rank: 1, title: "Short title", points: 10, comments: 0 }], 0);
const cached: CachedResult = { snapshot: cache.get()!, delayed: false };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
});
afterEach(() => vi.useRealTimers());

describe("EntriesQuery", () => {
  it("waits for usage persistence before returning entries", async () => {
    let finish!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const query = new EntriesQuery(
      { get: vi.fn().mockResolvedValue(cached) },
      { save },
    );
    let returned = false;
    const result = query.execute(EntryFilter.ShortTitle).then((entries) => {
      returned = true;
      return entries;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(returned).toBe(false);
    expect(save).toHaveBeenCalledWith({
      requestedAt: new Date(1_000),
      filter: "short-title",
      resultCount: 1,
      delayed: false,
      outcome: "success",
      errorCode: null,
    });
    finish();
    expect(await result).toEqual([
      { rank: 1, title: "Short title", points: 10, comments: 0 },
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not attempt another insert after a persistence failure", async () => {
    const error = new Error("Database unavailable");
    const save = vi.fn().mockRejectedValue(error);
    const query = new EntriesQuery(
      { get: vi.fn().mockResolvedValue(cached) },
      { save },
    );
    await expect(query.execute(EntryFilter.ShortTitle)).rejects.toMatchObject({
      code: "USAGE_PERSISTENCE_ERROR",
      cause: error,
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("persists a collection failure before propagating it", async () => {
    const error = new ScrapingParseError("Unexpected HTML");
    const save = vi.fn().mockResolvedValue(undefined);
    const query = new EntriesQuery(
      { get: vi.fn().mockRejectedValue(error) },
      { save },
    );
    await expect(query.execute(EntryFilter.LongTitle)).rejects.toMatchObject({
      code: "PARSE_ERROR",
      cause: error,
    });
    expect(save).toHaveBeenCalledWith({
      requestedAt: new Date(1_000),
      filter: "long-title",
      resultCount: 0,
      delayed: true,
      outcome: "failure",
      errorCode: "PARSE_ERROR",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out only the waiting caller and writes no late success record", async () => {
    let finish!: (result: CachedResult) => void;
    const pending = new Promise<CachedResult>((resolve) => {
      finish = resolve;
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const query = new EntriesQuery(
      { get: vi.fn().mockReturnValue(pending) },
      { save },
      100,
    );
    const request = query.execute(EntryFilter.ShortTitle);
    const rejected = expect(request).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "failure",
        errorCode: "REQUEST_TIMEOUT",
        delayed: true,
      }),
    );
    finish(cached);
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports persistence failure when writing a failure record also fails", async () => {
    const databaseError = new Error("Cannot insert");
    const query = new EntriesQuery(
      { get: vi.fn().mockRejectedValue(new Error("Offline")) },
      { save: vi.fn().mockRejectedValue(databaseError) },
    );
    await expect(query.execute(EntryFilter.LongTitle)).rejects.toMatchObject({
      code: "USAGE_PERSISTENCE_ERROR",
      cause: databaseError,
    });
  });
});
