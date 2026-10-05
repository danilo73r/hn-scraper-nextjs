import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CachedEntries } from "@/features/hacker-news/get-entries/cache/cached-entries";
import { SnapshotCache } from "@/features/hacker-news/get-entries/cache/snapshot-cache";
import type { Entry } from "@/features/hacker-news/get-entries/entry";

const entries: Entry[] = [
  { rank: 1, title: "News title", points: 5, comments: 2 },
];
const updated: Entry[] = [{ ...entries[0], points: 99 }];

function setup(age?: number) {
  const cache = new SnapshotCache();
  if (age !== undefined) cache.replace(entries, Date.now() - age);
  const collect = vi.fn().mockResolvedValue(updated);
  const service = new CachedEntries(cache, { requestCollection: collect });
  return { cache, collect, service };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => vi.useRealTimers());

describe("CachedEntries policies", () => {
  it("returns a fresh snapshot without collecting", async () => {
    const { cache, collect, service } = setup(59_999);
    expect(await service.get()).toEqual({
      snapshot: cache.get(),
      delayed: false,
    });
    expect(collect).not.toHaveBeenCalled();
  });

  it.each([60_000, 599_999])(
    "returns a stale snapshot immediately at age %i and refreshes in background",
    async (age) => {
      const { cache, collect, service } = setup(age);
      const previous = cache.get();
      let finish!: (value: Entry[]) => void;
      collect.mockImplementation(
        () =>
          new Promise<Entry[]>((resolve) => {
            finish = resolve;
          }),
      );
      const result = await service.get();
      expect(result).toEqual({ snapshot: previous, delayed: false });
      expect(cache.get()).toBe(previous);
      finish(updated);
      await service.refresh();
      expect(cache.get()?.entries[0].points).toBe(99);
      expect(cache.get()?.collectedAt).toBe(Date.now());
    },
  );

  it.each([undefined, 600_000])(
    "waits for a refresh when cache age is %s",
    async (age) => {
      const { collect, service } = setup(age);
      let finish!: (value: Entry[]) => void;
      collect.mockImplementation(
        () =>
          new Promise<Entry[]>((resolve) => {
            finish = resolve;
          }),
      );
      let returned = false;
      const request = service.get().then((result) => {
        returned = true;
        return result;
      });
      await Promise.resolve();
      expect(returned).toBe(false);
      finish(updated);
      const result = await request;
      expect(result.delayed).toBe(true);
      expect(result.snapshot.entries[0].points).toBe(99);
    },
  );

  it("uses configured freshness and maximum ages", async () => {
    const { cache, collect } = setup(9_999);
    const service = new CachedEntries(
      cache,
      { requestCollection: collect },
      { freshMs: 10_000, maxAgeMs: 20_000 },
    );
    await service.get();
    expect(collect).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect((await service.get()).delayed).toBe(false);
    await service.refresh();
    await vi.advanceTimersByTimeAsync(20_000);
    expect((await service.get()).delayed).toBe(true);
  });

  it("keeps stale data on background failure and clears the error only after success", async () => {
    const { cache, collect, service } = setup(60_000);
    const previous = cache.get();
    const error = new Error("Offline");
    collect.mockRejectedValueOnce(error);
    expect((await service.get()).snapshot).toBe(previous);
    await vi.advanceTimersByTimeAsync(0);
    expect(cache.get()).toBe(previous);
    expect(service.lastError).toBe(error);
    collect.mockResolvedValueOnce(updated);
    await service.refresh();
    expect(service.lastError).toBeNull();
    expect(cache.get()).not.toBe(previous);
  });

  it("propagates an expired cache refresh failure without discarding old entries", async () => {
    const { cache, collect, service } = setup(600_000);
    const previous = cache.get();
    const error = new Error("Offline");
    collect.mockRejectedValueOnce(error);
    await expect(service.get()).rejects.toBe(error);
    expect(cache.get()).toBe(previous);
    expect(service.lastError).toBe(error);
    expect((await service.get()).snapshot.entries[0].points).toBe(99);
    expect(service.lastError).toBeNull();
  });

  it("records preparation failures without publishing an incomplete snapshot", async () => {
    const { cache, service } = setup(600_000);
    const previous = cache.get();
    const error = new Error("Cannot prepare snapshot");
    vi.spyOn(cache, "replace").mockImplementationOnce(() => {
      throw error;
    });
    await expect(service.get()).rejects.toBe(error);
    expect(cache.get()).toBe(previous);
    expect(service.lastError).toBe(error);
  });
});
