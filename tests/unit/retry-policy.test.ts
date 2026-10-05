import { describe, expect, it } from "vitest";
import { getRetryDelayMs } from "@/features/hacker-news/get-entries/scraping/retry-policy";
import {
  ScrapingRequestError,
  ScrapingRequestErrorCode,
} from "@/features/hacker-news/get-entries/scraping/scraping-request-error";

describe("getRetryDelayMs", () => {
  it.each([
    new ScrapingRequestError(ScrapingRequestErrorCode.Network, "Network"),
    new ScrapingRequestError(ScrapingRequestErrorCode.Timeout, "Timeout"),
    ...[500, 502, 503, 504].map(
      (status) =>
        new ScrapingRequestError(
          ScrapingRequestErrorCode.Http,
          `HTTP ${status}`,
          { status },
        ),
    ),
  ])("waits 60 seconds after $message", (error) => {
    expect(getRetryDelayMs(error)).toBe(60_000);
  });

  it.each([301, 400, 403, 404, 501])("does not retry HTTP %i", (status) => {
    expect(
      getRetryDelayMs(
        new ScrapingRequestError(ScrapingRequestErrorCode.Http, "Failed", {
          status,
        }),
      ),
    ).toBeNull();
  });

  it("does not retry parsing or unexpected errors", () => {
    expect(getRetryDelayMs(new Error("Invalid HTML"))).toBeNull();
  });

  it.each([
    { header: "120", expected: 120_000 },
    { header: "10", expected: 60_000 },
    { header: "0", expected: 60_000 },
    { header: undefined, expected: 300_000 },
    { header: "invalid", expected: 300_000 },
    { header: "-1", expected: 300_000 },
    { header: "1.5", expected: 300_000 },
    { header: "99999999999999999999", expected: 300_000 },
  ])("uses $expected ms for Retry-After $header", ({ header, expected }) => {
    const error = new ScrapingRequestError(
      ScrapingRequestErrorCode.Http,
      "Limited",
      { status: 429, retryAfter: header },
    );
    expect(getRetryDelayMs(error)).toBe(expected);
  });

  it("supports an HTTP date in Retry-After", () => {
    const now = Date.UTC(2026, 9, 5);
    const retryAfter = new Date(now + 120_000).toUTCString();
    const error = new ScrapingRequestError(
      ScrapingRequestErrorCode.Http,
      "Limited",
      { status: 429, retryAfter },
    );
    expect(getRetryDelayMs(error, now)).toBe(120_000);
  });

  it.each([
    "Mon, 05 Oct 2026 00:02:00 GMT",
    "Monday, 05-Oct-26 00:02:00 GMT",
    "Mon Oct  5 00:02:00 2026",
  ])("supports HTTP date format: %s", (retryAfter) => {
    const error = new ScrapingRequestError(
      ScrapingRequestErrorCode.Http,
      "Limited",
      { status: 429, retryAfter },
    );
    expect(getRetryDelayMs(error, Date.UTC(2026, 9, 5))).toBe(120_000);
  });

  it.each([
    "Tue, 05 Oct 2026 00:02:00 GMT",
    "Tue, 31 Feb 2026 00:02:00 GMT",
    "Mon, 05 Oct 2026 00:02:00 UTC",
    "Mon, 05 Oct 2026 00:02:00 GMT extra",
    "Mon, 05 Oct 2026 24:02:00 GMT",
    "2026-10-05T00:02:00Z",
    "Mon, October 5, 2026 00:02:00 GMT",
  ])("uses the fallback for an invalid HTTP date: %s", (retryAfter) => {
    const error = new ScrapingRequestError(
      ScrapingRequestErrorCode.Http,
      "Limited",
      { status: 429, retryAfter },
    );
    expect(getRetryDelayMs(error, Date.UTC(2026, 9, 5))).toBe(300_000);
  });

  it("keeps the minimum delay for a past Retry-After date", () => {
    const now = Date.UTC(2026, 9, 5);
    const retryAfter = new Date(now - 120_000).toUTCString();
    const error = new ScrapingRequestError(
      ScrapingRequestErrorCode.Http,
      "Limited",
      { status: 429, retryAfter },
    );
    expect(getRetryDelayMs(error, now)).toBe(60_000);
  });
});
