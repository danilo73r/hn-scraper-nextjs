import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Pool } from "pg";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Entry } from "@/features/hacker-news/get-entries/entry";
import { SnapshotCache } from "@/features/hacker-news/get-entries/cache/snapshot-cache";
import { CachedEntries } from "@/features/hacker-news/get-entries/cache/cached-entries";
import { EntriesQuery } from "@/features/hacker-news/get-entries/entries-query";
import { UsageRepository } from "@/features/hacker-news/get-entries/usage/usage-repository";
import {
  ScrapingRequestError,
  ScrapingRequestErrorCode,
} from "@/features/hacker-news/get-entries/scraping/scraping-request-error";
import { createDatabasePool } from "@/infrastructure/database/client";
import { startTestPostgres, migrateTestPostgres } from "../setup/postgres";
import { GET } from "@/app/api/entries/route";

const { getEntriesQuery } = vi.hoisted(() => ({ getEntriesQuery: vi.fn() }));
vi.mock("@/features/hacker-news/get-entries/runtime", () => ({
  getEntriesQuery,
}));

const entries: Entry[] = [
  { rank: 1, title: "First short title", points: 5, comments: 0 },
  { rank: 2, title: "Second short title", points: 10, comments: 0 },
  { rank: 3, title: "First long title has six words", points: 0, comments: 5 },
  {
    rank: 4,
    title: "Second long title has six words",
    points: 0,
    comments: 10,
  },
];
let container: StartedPostgreSqlContainer;
let pool: Pool;
let service: CachedEntries;
let collect: ReturnType<typeof vi.fn<() => Promise<Entry[]>>>;

function request(filter = "short-title") {
  return GET(new Request("http://localhost/api/entries?filter=" + filter));
}

beforeAll(async () => {
  container = await startTestPostgres();
  pool = createDatabasePool(container.getConnectionUri());
  await migrateTestPostgres(container.getConnectionUri());
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
  const cache = new SnapshotCache();
  collect = vi.fn<() => Promise<Entry[]>>().mockResolvedValue(entries);
  service = new CachedEntries(cache, { requestCollection: collect });
  getEntriesQuery
    .mockReset()
    .mockReturnValue(new EntriesQuery(service, new UsageRepository(pool)));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/entries", () => {
  it.each([
    { filter: "short-title", ranks: [2, 1] },
    { filter: "long-title", ranks: [4, 3] },
  ])(
    "returns sorted $filter entries and saves usage",
    async ({ filter, ranks }) => {
      const response = await request(filter);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.entries.map((entry: Entry) => entry.rank)).toEqual(ranks);
      expect(
        (
          await pool.query(
            "SELECT filter, result_count, outcome FROM usage_events",
          )
        ).rows,
      ).toEqual([{ filter, result_count: 2, outcome: "success" }]);
    },
  );

  it("rejects an invalid filter", async () => {
    const response = await request("unknown");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_FILTER");
    expect(getEntriesQuery).not.toHaveBeenCalled();
  });

  it("returns an upstream error and records the failure", async () => {
    collect.mockRejectedValueOnce(
      new ScrapingRequestError(
        ScrapingRequestErrorCode.Http,
        "Upstream unavailable",
        { status: 500 },
      ),
    );
    const response = await request();
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("HTTP_ERROR");
    expect(
      (await pool.query("SELECT outcome, error_code FROM usage_events")).rows,
    ).toEqual([{ outcome: "failure", error_code: "HTTP_ERROR" }]);
  });

  it("returns 503 when usage cannot be saved", async () => {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN READ ONLY");
      getEntriesQuery.mockReturnValue(
        new EntriesQuery(service, new UsageRepository(connection)),
      );
      const response = await request();
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe(
        "USAGE_PERSISTENCE_ERROR",
      );
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
    }
  });
});
