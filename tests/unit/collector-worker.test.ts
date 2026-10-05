import {
  afterEach,
  beforeEach,
  describe,
  expect,
  inject,
  it,
  vi,
} from "vitest";
import {
  CollectorWorker,
  getCollectorWorker,
} from "@/features/hacker-news/get-entries/scraping/collector-worker";
import {
  ScrapingRequestError,
  ScrapingRequestErrorCode,
} from "@/features/hacker-news/get-entries/scraping/scraping-request-error";
import type { Entry } from "@/features/hacker-news/get-entries/entry";

// Route native promise timers through the clock controlled by vi.useFakeTimers.
vi.mock("node:timers/promises", () => ({
  setTimeout: (delayMs: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, delayMs)),
}));

const entries: Entry[] = [
  { rank: 1, title: "Example", points: 1, comments: 0 },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("CollectorWorker", () => {
  it("shares one collection across 100 simultaneous requests", async () => {
    let finish!: (entries: Entry[]) => void;
    const collect = vi.fn(
      () =>
        new Promise<Entry[]>((resolve) => {
          finish = resolve;
        }),
    );
    const worker = new CollectorWorker(collect);
    const requests = Array.from({ length: 100 }, () =>
      worker.requestCollection(),
    );
    expect(requests.every((request) => request === requests[0])).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(collect).toHaveBeenCalledTimes(1);
    expect(worker.state.status).toBe("collecting");
    finish(entries);
    expect(await Promise.all(requests)).toEqual(
      Array.from({ length: 100 }, () => entries),
    );
    expect(worker.state.status).toBe("cooldown");
  });

  it("waits for cooldown only when another collection is requested", async () => {
    const collect = vi.fn().mockResolvedValue(entries);
    const worker = new CollectorWorker(collect);
    await worker.requestCollection();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(collect).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(worker.state.status).toBe("idle");
    await worker.requestCollection();
    expect(collect).toHaveBeenCalledTimes(2);
  });

  it("coalesces requests during cooldown without starting early", async () => {
    const collect = vi.fn().mockResolvedValue(entries);
    const worker = new CollectorWorker(collect);
    await worker.requestCollection();
    const first = worker.requestCollection();
    const second = worker.requestCollection();
    expect(first).toBe(second);
    expect(worker.state.status).toBe("waiting");
    await vi.advanceTimersByTimeAsync(59_999);
    expect(collect).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await first;
    expect(collect).toHaveBeenCalledTimes(2);
  });

  it.each([
    { retryAfter: "300", cooldownMs: 300_000 },
    { retryAfter: "7200", cooldownMs: 3_600_000 },
  ])(
    "preserves a final 429 cooldown of $cooldownMs ms",
    async ({ retryAfter, cooldownMs }) => {
      const error = new ScrapingRequestError(
        ScrapingRequestErrorCode.Http,
        "Limited",
        { status: 429, retryAfter },
      );
      const collect = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(entries);
      const worker = new CollectorWorker(collect);
      await expect(worker.requestCollection()).rejects.toBe(error);
      expect(worker.state.lastError).toBe(error);
      const next = worker.requestCollection();
      expect(worker.state.nextAllowedAt).toBe(cooldownMs);
      await vi.advanceTimersByTimeAsync(cooldownMs - 1);
      expect(collect).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await next;
      expect(worker.state.lastError).toBeNull();
    },
  );

  it("shares failure and releases the operation for a later request", async () => {
    const error = new Error("Invalid HTML");
    const collect = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(entries);
    const worker = new CollectorWorker(collect);
    const first = worker.requestCollection();
    const second = worker.requestCollection();
    await expect(first).rejects.toBe(error);
    await expect(second).rejects.toBe(error);
    expect(worker.state).toEqual({
      status: "cooldown",
      nextAllowedAt: 60_000,
      lastError: error,
    });
    const recovery = worker.requestCollection();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await recovery).toEqual(entries);
    expect(collect).toHaveBeenCalledTimes(2);
    expect(worker.state.lastError).toBeNull();
  });

  it("returns the same worker for the current process", () => {
    expect(getCollectorWorker()).toBe(getCollectorWorker());
  });

  it("shares the active collection throughout its real retry delay", async () => {
    const { html } = inject("parserFixtures");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response(html));
    vi.stubGlobal("fetch", fetchMock);
    const worker = new CollectorWorker();
    const first = worker.requestCollection();
    await vi.advanceTimersByTimeAsync(30_000);
    const duringRetry = worker.requestCollection();
    expect(duringRetry).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(worker.state.status).toBe("collecting");
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await first).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
