import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { createDatabasePool } from "@/infrastructure/database/client";
import { UsageRepository } from "@/features/hacker-news/get-entries/usage/usage-repository";
import { EntryFilter } from "@/features/hacker-news/get-entries/entry-filter";
import { migrateTestPostgres, startTestPostgres } from "../../setup/postgres";

let container: StartedPostgreSqlContainer;
let pool: Pool;
let repository: UsageRepository;

beforeAll(async () => {
  container = await startTestPostgres();
  pool = createDatabasePool(container.getConnectionUri());
  await migrateTestPostgres(container.getConnectionUri());
  repository = new UsageRepository(pool);
});

afterAll(async () => {
  try {
    await pool?.end();
  } finally {
    await container?.stop();
  }
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE usage_events");
});

describe("UsageRepository", () => {
  it("propagates database constraint errors without saving the event", async () => {
    await expect(
      repository.save({
        requestedAt: new Date(),
        filter: EntryFilter.LongTitle,
        resultCount: -1,
        delayed: false,
        outcome: "success",
        errorCode: null,
      }),
    ).rejects.toMatchObject({ code: "23514" });
    expect((await pool.query("SELECT * FROM usage_events")).rows).toEqual([]);
  });

  it("propagates a database write failure", async () => {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN READ ONLY");
      await expect(
        new UsageRepository(connection).save({
          requestedAt: new Date(),
          filter: EntryFilter.ShortTitle,
          resultCount: 0,
          delayed: false,
          outcome: "success",
          errorCode: null,
        }),
      ).rejects.toMatchObject({ code: "25006" });
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
    }
    expect((await pool.query("SELECT * FROM usage_events")).rows).toEqual([]);
  });

  it.each([
    { filter: EntryFilter.LongTitle, resultCount: 12, delayed: false },
    { filter: EntryFilter.ShortTitle, resultCount: 0, delayed: true },
  ])("persists a successful request with filter $filter", async (fields) => {
    const requestedAt = new Date("2026-10-05T09:00:00-05:00");
    await repository.save({
      requestedAt,
      ...fields,
      outcome: "success",
      errorCode: null,
    });
    const result = await pool.query("SELECT * FROM usage_events");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      requested_at: requestedAt,
      filter: fields.filter,
      result_count: fields.resultCount,
      delayed: fields.delayed,
      outcome: "success",
      error_code: null,
    });
  });

  it("persists a failed request and its error code", async () => {
    const requestedAt = new Date("2026-10-05T14:00:00Z");
    await repository.save({
      requestedAt,
      filter: EntryFilter.LongTitle,
      resultCount: 0,
      delayed: true,
      outcome: "failure",
      errorCode: "SCRAPING_TIMEOUT",
    });
    expect((await pool.query("SELECT * FROM usage_events")).rows).toEqual([
      expect.objectContaining({
        requested_at: requestedAt,
        filter: "long-title",
        result_count: 0,
        delayed: true,
        outcome: "failure",
        error_code: "SCRAPING_TIMEOUT",
      }),
    ]);
  });

  it("stores error text as data rather than SQL", async () => {
    const errorCode = "'); DROP TABLE usage_events; --";
    await repository.save({
      requestedAt: new Date(),
      filter: EntryFilter.ShortTitle,
      resultCount: 0,
      delayed: false,
      outcome: "failure",
      errorCode,
    });
    expect(
      (await pool.query("SELECT error_code FROM usage_events")).rows,
    ).toEqual([{ error_code: errorCode }]);
  });

  it("persists every usage event under concurrent requests", async () => {
    await Promise.all(
      Array.from({ length: 20 }, () =>
        repository.save({
          requestedAt: new Date(),
          filter: EntryFilter.LongTitle,
          resultCount: 5,
          delayed: false,
          outcome: "success",
          errorCode: null,
        }),
      ),
    );
    const result = await pool.query("SELECT id FROM usage_events");
    expect(result.rows).toHaveLength(20);
    expect(new Set(result.rows.map((row) => row.id)).size).toBe(20);
  });
});
