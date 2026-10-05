import type { CachePolicy } from "./cached-entries";

export function readCachePolicy(
  env: Readonly<Record<string, string | undefined>> = process.env,
): CachePolicy {
  const freshMs = readMilliseconds(env, "CACHE_FRESH_SECONDS", 60);
  const maxAgeMs = readMilliseconds(env, "CACHE_MAX_AGE_SECONDS", 600);
  if (maxAgeMs <= freshMs) {
    throw new Error(
      "CACHE_MAX_AGE_SECONDS must be greater than CACHE_FRESH_SECONDS.",
    );
  }
  return Object.freeze({ freshMs, maxAgeMs });
}

function readMilliseconds(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: number,
): number {
  const seconds = env[name] === undefined ? fallback : Number(env[name]);
  const milliseconds = seconds * 1000;
  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    !Number.isSafeInteger(milliseconds)
  ) {
    throw new Error(
      `${name} must be a positive integer within the supported range.`,
    );
  }
  return milliseconds;
}
