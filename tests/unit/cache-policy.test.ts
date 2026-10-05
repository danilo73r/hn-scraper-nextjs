import { describe, expect, it } from "vitest";
import { readCachePolicy } from "@/features/hacker-news/get-entries/cache/cache-policy";

describe("readCachePolicy", () => {
  it("defaults to 60 seconds fresh and 10 minutes maximum age", () => {
    expect(readCachePolicy({})).toEqual({ freshMs: 60_000, maxAgeMs: 600_000 });
  });
  it("converts configured seconds to milliseconds", () => {
    expect(
      readCachePolicy({
        CACHE_FRESH_SECONDS: "30",
        CACHE_MAX_AGE_SECONDS: "300",
      }),
    ).toEqual({ freshMs: 30_000, maxAgeMs: 300_000 });
  });
  it.each(["30", "60"])(
    "rejects maximum age %s not greater than freshness",
    (value) => {
      expect(() => readCachePolicy({ CACHE_MAX_AGE_SECONDS: value })).toThrow(
        "greater",
      );
    },
  );
});
