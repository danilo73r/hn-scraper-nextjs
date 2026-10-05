import { createDatabasePool } from "@/infrastructure/database/client";
import { readDurationMs } from "@/infrastructure/config/read-duration";
import { getCachedEntries } from "./cache/runtime";
import { EntriesQuery } from "./entries-query";
import { UsageRepository } from "./usage/usage-repository";

const processState = globalThis as typeof globalThis & {
  hackerNewsEntriesQuery?: EntriesQuery;
};

export function getEntriesQuery(): EntriesQuery {
  if (!processState.hackerNewsEntriesQuery) {
    const timeoutMs = readDurationMs(
      process.env,
      "REQUEST_TIMEOUT_SECONDS",
      10,
    );
    processState.hackerNewsEntriesQuery = new EntriesQuery(
      getCachedEntries(),
      new UsageRepository(createDatabasePool()),
      timeoutMs,
    );
  }
  return processState.hackerNewsEntriesQuery;
}
