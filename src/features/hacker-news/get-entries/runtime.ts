import { createDatabasePool } from "@/infrastructure/database/client";
import { getCachedEntries } from "./cache/runtime";
import { EntriesQuery } from "./entries-query";
import { UsageRepository } from "./usage/usage-repository";

const processState = globalThis as typeof globalThis & {
  hackerNewsEntriesQuery?: EntriesQuery;
};

export function getEntriesQuery(): EntriesQuery {
  if (!processState.hackerNewsEntriesQuery) {
    const timeoutMs = readRequestTimeoutMs();
    processState.hackerNewsEntriesQuery = new EntriesQuery(
      getCachedEntries(),
      new UsageRepository(createDatabasePool()),
      timeoutMs,
    );
  }
  return processState.hackerNewsEntriesQuery;
}

export function readRequestTimeoutMs(
  env: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const seconds =
    env.REQUEST_TIMEOUT_SECONDS === undefined
      ? 10
      : Number(env.REQUEST_TIMEOUT_SECONDS);
  const milliseconds = seconds * 1000;
  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    !Number.isSafeInteger(milliseconds) ||
    milliseconds > 2_147_483_647
  ) {
    throw new Error(
      "REQUEST_TIMEOUT_SECONDS must be a positive integer within the timer range.",
    );
  }
  return milliseconds;
}
