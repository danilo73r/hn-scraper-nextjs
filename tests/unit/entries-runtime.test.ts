import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEntriesQuery } from "@/features/hacker-news/get-entries/runtime";

const { createDatabasePool, getCachedEntries } = vi.hoisted(() => ({
  createDatabasePool: vi.fn(() => ({ query: vi.fn() })),
  getCachedEntries: vi.fn(() => ({ get: vi.fn() })),
}));
vi.mock("@/infrastructure/database/client", () => ({ createDatabasePool }));
vi.mock("@/features/hacker-news/get-entries/cache/runtime", () => ({
  getCachedEntries,
}));

beforeEach(() => {
  vi.stubGlobal("hackerNewsEntriesQuery", undefined);
  vi.stubEnv("REQUEST_TIMEOUT_SECONDS", "10");
  createDatabasePool.mockClear();
  getCachedEntries.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("entries runtime", () => {
  it("shares a single query and database pool per process", () => {
    expect(getEntriesQuery()).toBe(getEntriesQuery());
    expect(createDatabasePool).toHaveBeenCalledTimes(1);
    expect(getCachedEntries).toHaveBeenCalledTimes(1);
  });
});
