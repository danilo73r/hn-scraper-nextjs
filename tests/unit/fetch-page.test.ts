import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPage } from "@/features/hacker-news/get-entries/scraping/fetch-page";
import { ScrapingRequestErrorCode } from "@/features/hacker-news/get-entries/scraping/scraping-request-error";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchPage", () => {
  it("downloads HTML from the fixed URL without redirects or HTTP caching", async () => {
    const html = "<html>Hacker News</html>";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(html));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPage(1000);

    expect(result).toBe(html);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://news.ycombinator.com/",
      expect.objectContaining({
        redirect: "error",
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([301, 403, 429, 500, 503])(
    "rejects HTTP status %i without retrying",
    async (status) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(fetchPage(1000)).rejects.toMatchObject({
        name: "ScrapingRequestError",
        code: ScrapingRequestErrorCode.Http,
        status,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("preserves the cause of a network failure", async () => {
    const cause = new TypeError("Connection failed");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(cause));

    await expect(fetchPage(1000)).rejects.toMatchObject({
      code: ScrapingRequestErrorCode.Network,
      cause,
    });
  });

  it.each(["headers", "body"] as const)(
    "aborts when waiting for %s exceeds the timeout",
    async (phase) => {
      vi.useFakeTimers();
      let requestSignal: AbortSignal | undefined;
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation((_url, options) => {
          requestSignal = options?.signal ?? undefined;
          const pendingStream = new ReadableStream({
            start(controller) {
              requestSignal?.addEventListener(
                "abort",
                () => controller.error(requestSignal?.reason),
                { once: true },
              );
            },
          });
          if (phase === "body")
            return Promise.resolve(new Response(pendingStream));
          return new Promise((_resolve, reject) => {
            requestSignal?.addEventListener(
              "abort",
              () => reject(requestSignal?.reason),
              { once: true },
            );
          });
        });
      vi.stubGlobal("fetch", fetchMock);

      const assertion = expect(fetchPage(100)).rejects.toMatchObject({
        code: ScrapingRequestErrorCode.Timeout,
      });
      await vi.advanceTimersByTimeAsync(100);
      await assertion;

      expect(requestSignal?.aborted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("clears the timeout after a successful download", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response("HTML")),
    );

    await fetchPage(1000);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports a failed response body as a network error", async () => {
    const cause = new Error("Connection closed while reading HTML");
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(cause);
        },
      }),
    );
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(response));

    await expect(fetchPage(1000)).rejects.toMatchObject({
      code: ScrapingRequestErrorCode.Network,
      cause,
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    "rejects invalid timeout %s before making a request",
    async (timeoutMs) => {
      const fetchMock = vi.fn<typeof fetch>();
      vi.stubGlobal("fetch", fetchMock);

      await expect(fetchPage(timeoutMs)).rejects.toBeInstanceOf(RangeError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
