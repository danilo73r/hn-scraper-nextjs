import type { CachePolicy } from "./cached-entries";
import { readDurationMs } from "@/infrastructure/config/read-duration";

export function readCachePolicy(
  env: Readonly<Record<string, string | undefined>> = process.env,
): CachePolicy {
  const freshMs = readDurationMs(env, "CACHE_FRESH_SECONDS", 60);
  const maxAgeMs = readDurationMs(env, "CACHE_MAX_AGE_SECONDS", 600);
  if (maxAgeMs <= freshMs) {
    throw new Error(
      "CACHE_MAX_AGE_SECONDS must be greater than CACHE_FRESH_SECONDS.",
    );
  }
  return Object.freeze({ freshMs, maxAgeMs });
}
