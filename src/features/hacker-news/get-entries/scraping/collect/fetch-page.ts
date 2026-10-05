import {
  ScrapingRequestError,
  ScrapingRequestErrorCode,
} from "../scraping-request-error";

const hackerNewsUrl = "https://news.ycombinator.com/";
const fetchTimeoutMs = 10_000;

export async function fetchPage(): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

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
        {
          status: response.status,
          retryAfter: response.headers.get("retry-after") ?? undefined,
        },
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
