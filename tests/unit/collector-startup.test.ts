import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { register } from "@/instrumentation";

const { start, getCachedEntries } = vi.hoisted(() => {
  const start = vi.fn();
  return { start, getCachedEntries: vi.fn(() => ({ start })) };
});
vi.mock("@/features/hacker-news/get-entries/cache/runtime", () => ({
  getCachedEntries,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("NEXT_PHASE", undefined);
  start.mockReset().mockResolvedValue(undefined);
  getCachedEntries.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("collector startup registration", () => {
  it("launches initial collection without blocking server registration", async () => {
    start.mockReturnValue(new Promise(() => {}));
    await register();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it.each([
    { runtime: "edge", phase: undefined },
    { runtime: "nodejs", phase: "phase-production-build" },
  ])(
    "does not collect in runtime $runtime during phase $phase",
    async ({ runtime, phase }) => {
      vi.stubEnv("NEXT_RUNTIME", runtime);
      vi.stubEnv("NEXT_PHASE", phase);
      await register();
      expect(getCachedEntries).not.toHaveBeenCalled();
    },
  );

  it("reports startup failure without failing server registration", async () => {
    const error = new Error("Offline");
    start.mockRejectedValue(error);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await register();
    expect(log).toHaveBeenCalledWith(
      "Initial Hacker News collection failed.",
      error,
    );
  });
});
