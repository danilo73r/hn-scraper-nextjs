import {
  ScrapingRequestError,
  ScrapingRequestErrorCode,
} from "./scraping-request-error";
import { parseHttpDate } from "./parse-http-date";

export const maxCollectionAttempts = 3;
export const retryIntervalMs = 60_000;
const rateLimitFallbackMs = retryIntervalMs * 5;
const retryableHttpStatuses = new Set([500, 502, 503, 504]);

export function getRetryDelayMs(
  error: unknown,
  now = Date.now(),
): number | null {
  if (!(error instanceof ScrapingRequestError)) return null;

  if (
    error.code === ScrapingRequestErrorCode.Network ||
    error.code === ScrapingRequestErrorCode.Timeout
  )
    return retryIntervalMs;

  if (error.status === 429) return getRateLimitDelayMs(error.retryAfter, now);

  return error.status !== undefined && retryableHttpStatuses.has(error.status)
    ? retryIntervalMs
    : null;
}

function getRateLimitDelayMs(
  retryAfter: string | undefined,
  now: number,
): number {
  if (!retryAfter) return rateLimitFallbackMs;
  const value = retryAfter.trim();
  const delayMs = /^\d+$/u.test(value)
    ? Number(value) * 1000
    : parseHttpDate(value) - now;
  if (!Number.isSafeInteger(delayMs)) return rateLimitFallbackMs;
  return Math.max(retryIntervalMs, delayMs);
}
