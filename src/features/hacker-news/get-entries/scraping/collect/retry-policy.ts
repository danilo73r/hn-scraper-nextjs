import {
  ScrapingRequestError,
  ScrapingRequestErrorCode,
} from "../scraping-request-error";
import { DateTime } from "luxon";

export const maxCollectionAttempts = 3;
export const retryIntervalMs = 60_000;
const retryAfterFallbackMs = retryIntervalMs * 5;
const maxRetryAfterDelayMs = retryIntervalMs * 60;
const retryableHttpStatuses = new Set([500, 502, 503, 504]);

export function getRetryDelayMs(
  error: ScrapingRequestError,
  now = Date.now(),
): number | null {
  if (
    error.code === ScrapingRequestErrorCode.Network ||
    error.code === ScrapingRequestErrorCode.Timeout
  )
    return retryIntervalMs;

  if (error.status === 429) return get429DelayMs(error.retryAfter, now);

  if (error.status !== undefined && retryableHttpStatuses.has(error.status))
    return retryIntervalMs;

  return null;
}

function get429DelayMs(retryAfter: string | undefined, now: number): number {
  if (!retryAfter) return retryAfterFallbackMs;

  const value = retryAfter.trim();
  const delayMs = /^\d+$/u.test(value)
    ? Number(value) * 1000
    : parseHttpDate(value) - now;

  if (!Number.isSafeInteger(delayMs)) return retryAfterFallbackMs;

  const atLeastRetryInteval = Math.max(retryIntervalMs, delayMs);
  const boundedDelayMs = Math.min(maxRetryAfterDelayMs, atLeastRetryInteval);
  return boundedDelayMs;
}

function parseHttpDate(value: string): number {
  const date = DateTime.fromHTTP(value, { zone: "utc" });
  return date.isValid ? date.toMillis() : Number.NaN;
}
