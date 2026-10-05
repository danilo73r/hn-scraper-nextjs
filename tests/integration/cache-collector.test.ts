import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CachedEntries } from "@/features/hacker-news/get-entries/cache/cached-entries";
import { SnapshotCache } from "@/features/hacker-news/get-entries/cache/snapshot-cache";
import { CollectorWorker } from "@/features/hacker-news/get-entries/scraping/collector-worker";

vi.mock("node:timers/promises", () => ({
  setTimeout: (delay: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, delay)),
}));
const html = readFileSync(
  new URL("../fixtures/hacker-news.html", import.meta.url),
  "utf8",
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("cache and collector coordination", () => {
  it("shares startup collection across incoming requests", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(html));
    vi.stubGlobal("fetch", fetch);
    const cache = new SnapshotCache();
    const publish = vi.spyOn(cache, "replace");
    const service = new CachedEntries(cache, new CollectorWorker());
    const startup = service.start();
    expect(service.start()).toBe(startup);
    const results = await Promise.all(
      Array.from({ length: 100 }, () => service.get()),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      results.every((result) => result.snapshot === results[0].snapshot),
    ).toBe(true);
    expect(await startup).toBe(results[0].snapshot);
    expect(results[0].snapshot.entries).toHaveLength(3);
    expect(publish).toHaveBeenCalledTimes(1);
    await service.start();
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns stale entries during retries and lets expired requests join the same refresh", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(html))
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response(html));
    vi.stubGlobal("fetch", fetch);
    const service = new CachedEntries(
      new SnapshotCache(),
      new CollectorWorker(),
      { freshMs: 10_000, maxAgeMs: 20_000 },
    );
    const previous = await service.start();
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await service.get()).snapshot).toBe(previous);
    await vi.advanceTimersByTimeAsync(10_000);
    const waiting = service.get();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await waiting;
    expect(result.delayed).toBe(true);
    expect(result.snapshot).not.toBe(previous);
    expect(result.snapshot.collectedAt).toBe(120_000);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("keeps failed startup state and recovers only after the worker cooldown", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response("", { status: 400 }))
      .mockResolvedValueOnce(new Response(html));
    vi.stubGlobal("fetch", fetch);
    const service = new CachedEntries(
      new SnapshotCache(),
      new CollectorWorker(),
    );
    await expect(service.start()).rejects.toMatchObject({
      code: "HTTP_ERROR",
      status: 400,
    });
    expect(service.lastError).toMatchObject({ code: "HTTP_ERROR" });
    const request = service.get();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await request).snapshot.entries).toHaveLength(3);
    expect(service.lastError).toBeNull();
  });
});
