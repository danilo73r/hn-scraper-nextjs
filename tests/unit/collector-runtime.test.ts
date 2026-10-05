import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectorWorker } from "@/features/hacker-news/get-entries/scraping/collector-worker";
import { getCachedEntries } from "@/features/hacker-news/get-entries/cache/runtime";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.stubGlobal("hackerNewsCachedEntries", undefined);
  vi.stubEnv("CACHE_FRESH_SECONDS", "60");
  vi.stubEnv("CACHE_MAX_AGE_SECONDS", "600");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("collector runtime", () => {
  it("shares startup and cache across module reloads in the process", async () => {
    const collect = vi
      .fn()
      .mockResolvedValue([{ rank: 1, title: "News", points: 0, comments: 0 }]);
    vi.stubGlobal("hackerNewsCollectorWorker", new CollectorWorker(collect));
    const service = getCachedEntries();
    await service.start();
    vi.resetModules();
    const reloaded =
      await import("@/features/hacker-news/get-entries/cache/runtime");
    expect(reloaded.getCachedEntries()).toBe(service);
    await reloaded.getCachedEntries().start();
    expect(collect).toHaveBeenCalledTimes(1);
  });

  it("reads cache configuration once when creating the shared instance", async () => {
    const collect = vi
      .fn()
      .mockResolvedValue([{ rank: 1, title: "News", points: 0, comments: 0 }]);
    vi.stubGlobal("hackerNewsCollectorWorker", new CollectorWorker(collect));
    const service = getCachedEntries();
    await service.start();
    vi.stubEnv("CACHE_FRESH_SECONDS", "1");
    await vi.advanceTimersByTimeAsync(2_000);
    expect((await getCachedEntries().get()).delayed).toBe(false);
    expect(collect).toHaveBeenCalledTimes(1);
  });
});
