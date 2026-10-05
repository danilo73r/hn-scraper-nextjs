import { describe, expect, it, vi } from "vitest";
import type { QueryResult } from "pg";
import { EntryFilter } from "@/features/hacker-news/get-entries/entry-filter";
import { UsageRepository } from "@/features/hacker-news/get-entries/usage/usage-repository";
import type { UsageEvent } from "@/features/hacker-news/get-entries/usage/usage-event";

const event: UsageEvent = {
  requestedAt: new Date("2026-10-05T14:00:00Z"),
  filter: EntryFilter.LongTitle,
  resultCount: 3,
  delayed: false,
  outcome: "success",
  errorCode: null,
};

describe("UsageRepository completion", () => {
  it("waits until the database finishes the insert", async () => {
    let finish!: (result: QueryResult) => void;
    const pending = new Promise<QueryResult>((resolve) => {
      finish = resolve;
    });
    const repository = new UsageRepository({
      query: vi.fn().mockReturnValue(pending),
    });
    let saved = false;
    const saving = repository.save(event).then(() => {
      saved = true;
    });

    await Promise.resolve();
    expect(saved).toBe(false);
    finish({ command: "INSERT", rowCount: 1, oid: 0, fields: [], rows: [] });
    await saving;
    expect(saved).toBe(true);
  });

  it("preserves the original database error", async () => {
    const error = new Error("Database unavailable");
    const repository = new UsageRepository({
      query: vi.fn().mockRejectedValue(error),
    });
    await expect(repository.save(event)).rejects.toBe(error);
  });
});
