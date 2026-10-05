import type { CachedEntries, CachedResult } from "./cache/cached-entries";
import type { Entry } from "./entry";
import type { EntryFilter } from "./entry-filter";
import { filterEntries } from "./filter-entries";
import { sortEntries } from "./sort-entries";
import type { UsageRepository } from "./usage/usage-repository";
import type { UsageEvent } from "./usage/usage-event";
import { EntriesQueryError, toEntriesQueryError } from "./entries-query-error";

export class EntriesQuery {
  constructor(
    private readonly cache: Pick<CachedEntries, "get">,
    private readonly usage: Pick<UsageRepository, "save">,
    private readonly timeoutMs = 10_000,
  ) {}

  async execute(filter: EntryFilter): Promise<Entry[]> {
    const requestedAt = new Date();
    let delayed = true;
    let entries: Entry[];
    try {
      const cached = await this.waitForCache();
      delayed = cached.delayed;
      entries = sortEntries(
        filterEntries(cached.snapshot.entries, filter),
        filter,
      ).map(({ rank, title, points, comments }) => ({
        rank,
        title,
        points,
        comments,
      }));
    } catch (cause) {
      const error = toEntriesQueryError(cause);
      await this.saveUsage({
        requestedAt,
        filter,
        resultCount: 0,
        delayed,
        outcome: "failure",
        errorCode: error.code,
      });
      throw error;
    }

    await this.saveUsage({
      requestedAt,
      filter,
      resultCount: entries.length,
      delayed,
      outcome: "success",
      errorCode: null,
    });
    return entries;
  }

  private async waitForCache(): Promise<CachedResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new EntriesQueryError("REQUEST_TIMEOUT")),
          this.timeoutMs,
        );
      });
      // Expiring one caller must not abort the shared collection.
      return await Promise.race([this.cache.get(), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async saveUsage(event: UsageEvent): Promise<void> {
    try {
      await this.usage.save(event);
    } catch (error) {
      throw new EntriesQueryError("USAGE_PERSISTENCE_ERROR", error);
    }
  }
}
