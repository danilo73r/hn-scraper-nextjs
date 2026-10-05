import {
  ScrapingRequestError,
  ScrapingRequestErrorCode,
} from "./scraping-request-error";

const hackerNewsUrl = "https://news.ycombinator.com/";
const maxFetchTimeoutMs = 60_000;

export async function fetchPage(timeoutMs: number): Promise<string> {
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > maxFetchTimeoutMs
  ) {
    throw new RangeError(`Fetch timeout between: 1–${maxFetchTimeoutMs} ms`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(hackerNewsUrl, {
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ScrapingRequestError(
        ScrapingRequestErrorCode.Http,
        `Hacker News returned HTTP ${response.status}.`,
        { status: response.status },
      );
    }

    // Keep the timeout active until the complete HTML body has been read.
    return await response.text();
  } catch (cause) {
    if (cause instanceof ScrapingRequestError) throw cause;

    if (controller.signal.aborted) {
      throw new ScrapingRequestError(
        ScrapingRequestErrorCode.Timeout,
        "Hacker News download timed out.",
        { cause },
      );
    }

    throw new ScrapingRequestError(
      ScrapingRequestErrorCode.Network,
      "Could not download Hacker News HTML.",
      { cause },
    );
  } finally {
    clearTimeout(timeout);
  }
}
