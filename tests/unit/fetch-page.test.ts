import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPage } from "@/features/hacker-news/get-entries/scraping/collect/fetch-page";
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

    const result = await fetchPage();

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

      await expect(fetchPage()).rejects.toMatchObject({
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

    await expect(fetchPage()).rejects.toMatchObject({
      code: ScrapingRequestErrorCode.Network,
      cause,
    });
  });

  it.each(["headers", "body"] as const)(
    "aborts after 10 seconds while waiting for %s",
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

      const assertion = expect(fetchPage()).rejects.toMatchObject({
        code: ScrapingRequestErrorCode.Timeout,
      });
      await vi.advanceTimersByTimeAsync(9_999);
      expect(requestSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
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

    await fetchPage();

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

    await expect(fetchPage()).rejects.toMatchObject({
      code: ScrapingRequestErrorCode.Network,
      cause,
    });
  });
});
