import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { createDatabasePool } from "@/infrastructure/database/client";
import { migrateTestPostgres, startTestPostgres } from "../../setup/postgres";
let container: StartedPostgreSqlContainer;
let pool: Pool;

function migrate(direction: "up" | "down" = "up") {
  return migrateTestPostgres(container.getConnectionUri(), direction);
}

beforeAll(async () => {
  container = await startTestPostgres();
  pool = createDatabasePool(container.getConnectionUri());
  await migrate();
}, 120_000);

afterAll(async () => {
  try {
    await pool?.end();
  } finally {
    await container?.stop();
  }
}, 30_000);

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE usage_events");
});

describe("usage migration", () => {
  it("creates the usage schema without a scraped entries table", async () => {
    const columns = await pool.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'usage_events'
      ORDER BY ordinal_position
    `);
    expect(columns.rows.map((column) => column.column_name)).toEqual([
      "id",
      "requested_at",
      "filter",
      "result_count",
      "delayed",
      "outcome",
      "error_code",
    ]);
    const tables = await pool.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    expect(tables.rows.map((table) => table.tablename)).toEqual([
      "pgmigrations",
      "usage_events",
    ]);
  });

  it("does not reapply migrations or lose existing usage records", async () => {
    await pool.query(`
      INSERT INTO usage_events (requested_at, filter, result_count, delayed, outcome)
      VALUES (NOW(), 'long-title', 5, false, 'success')
    `);
    expect(await migrate()).toHaveLength(0);
    expect((await pool.query("SELECT * FROM pgmigrations")).rowCount).toBe(2);
    expect((await pool.query("SELECT * FROM usage_events")).rowCount).toBe(1);
  });

  it("stores request timestamps as instants and accepts failure details", async () => {
    const result = await pool.query(
      `
      INSERT INTO usage_events
        (requested_at, filter, result_count, delayed, outcome, error_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        "2026-10-05T09:00:00-05:00",
        "short-title",
        0,
        true,
        "failure",
        "SCRAPING_TIMEOUT",
      ],
    );
    expect(result.rows[0]).toMatchObject({
      requested_at: new Date("2026-10-05T14:00:00Z"),
      filter: "short-title",
      result_count: 0,
      delayed: true,
      outcome: "failure",
      error_code: "SCRAPING_TIMEOUT",
    });
  });

  it.each([
    { filter: "invalid", count: 0, outcome: "success" },
    { filter: "long-title", count: -1, outcome: "success" },
    { filter: "short-title", count: 0, outcome: "invalid" },
  ])(
    "rejects invalid usage values: $filter / $count / $outcome",
    async ({ filter, count, outcome }) => {
      await expect(
        pool.query(
          `
      INSERT INTO usage_events (requested_at, filter, result_count, delayed, outcome)
      VALUES (NOW(), $1, $2, false, $3)
    `,
          [filter, count, outcome],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    },
  );

  it("requires the request timestamp", async () => {
    await expect(
      pool.query(`
      INSERT INTO usage_events (filter, result_count, delayed, outcome)
      VALUES ('long-title', 0, false, 'success')
    `),
    ).rejects.toMatchObject({ code: "23502" });
  });

  it("can roll back and reapply the migration on a disposable database", async () => {
    // Undo the filter extension before removing the table.
    await migrate("down");
    await migrate("down");
    expect(
      (await pool.query("SELECT to_regclass('public.usage_events') AS name"))
        .rows[0].name,
    ).toBeNull();
    expect((await pool.query("SELECT * FROM pgmigrations")).rowCount).toBe(0);
    await migrate();
    expect((await pool.query("SELECT * FROM usage_events")).rowCount).toBe(0);
  });
});
