import {
  afterEach,
  beforeEach,
  describe,
  expect,
  inject,
  it,
  vi,
} from "vitest";
import { collectWithRetries } from "@/features/hacker-news/get-entries/scraping/collect/collect-with-retries";
import { ScrapingRequestErrorCode } from "@/features/hacker-news/get-entries/scraping/scraping-request-error";
import { ScrapingParseError } from "@/features/hacker-news/get-entries/scraping/scraping-parse-error";

// Route native promise timers through the clock controlled by vi.useFakeTimers.
vi.mock("node:timers/promises", () => ({
  setTimeout: (delayMs: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, delayMs)),
}));

const { html } = inject("parserFixtures");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("collectWithRetries", () => {
  it("returns after a successful first attempt without waiting", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(html));
    vi.stubGlobal("fetch", fetchMock);
    expect(await collectWithRetries()).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits 60 seconds after failure before retrying", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response(html));
    vi.stubGlobal("fetch", fetchMock);
    const collection = collectWithRetries();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await collection).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("limits mixed timeout, network and HTTP failures to three total attempts", async () => {
    const startedAt = Date.now();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              "abort",
              () => reject(options.signal?.reason),
              { once: true },
            );
          }),
      )
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const assertion = expect(collectWithRetries()).rejects.toMatchObject({
      code: ScrapingRequestErrorCode.Http,
      status: 503,
    });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(Date.now() - startedAt).toBe(130_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops immediately when a retry encounters invalid HTML", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response("Invalid HTML"));
    vi.stubGlobal("fetch", fetchMock);
    const assertion =
      expect(collectWithRetries()).rejects.toBeInstanceOf(ScrapingParseError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not retry HTTP 403", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(collectWithRetries()).rejects.toMatchObject({
      status: 403,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves Retry-After when all three attempts are rate limited", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(null, {
          status: 429,
          headers: { "Retry-After": "600" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const assertion = expect(collectWithRetries()).rejects.toMatchObject({
      status: 429,
      retryAfter: "600",
    });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { retryAfter: "120", delay: 120_000 },
    { retryAfter: undefined, delay: 300_000 },
  ])("waits $delay ms after HTTP 429", async ({ retryAfter, delay }) => {
    const headers = retryAfter ? { "Retry-After": retryAfter } : undefined;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers }))
      .mockResolvedValueOnce(new Response(html));
    vi.stubGlobal("fetch", fetchMock);
    const collection = collectWithRetries();
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await collection;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
