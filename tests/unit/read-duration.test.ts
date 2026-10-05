import { afterEach, describe, expect, it, vi } from "vitest";
import { readDurationMs } from "@/infrastructure/config/read-duration";

afterEach(() => vi.unstubAllEnvs());

describe("readDurationMs", () => {
  it("reuses a process duration after its first read", () => {
    vi.stubEnv("CACHED_DURATION_SECONDS", "10");
    expect(readDurationMs(process.env, "CACHED_DURATION_SECONDS", 5)).toBe(
      10_000,
    );
    vi.stubEnv("CACHED_DURATION_SECONDS", "20");
    expect(readDurationMs(process.env, "CACHED_DURATION_SECONDS", 5)).toBe(
      10_000,
    );
    expect(
      readDurationMs(
        { CACHED_DURATION_SECONDS: "30" },
        "CACHED_DURATION_SECONDS",
        5,
      ),
    ).toBe(30_000);
  });
  it("converts configured or default seconds to milliseconds", () => {
    expect(readDurationMs({}, "DURATION", 10)).toBe(10_000);
    expect(readDurationMs({ DURATION: "20" }, "DURATION", 10)).toBe(20_000);
    expect(readDurationMs({ DURATION: "3600" }, "DURATION", 10)).toBe(
      3_600_000,
    );
  });

  it.each(["", "-1", "0", "1.5", "abc", "Infinity"])(
    "rejects invalid seconds %s",
    (value) => {
      expect(() => readDurationMs({ DURATION: value }, "DURATION", 10)).toThrow(
        "DURATION",
      );
    },
  );
});
