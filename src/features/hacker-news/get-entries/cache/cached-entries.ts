import type { Entry } from "../entry";
import type { EntrySnapshot } from "./entry-snapshot";
import { SnapshotCache } from "./snapshot-cache";

export interface EntryCollector {
  requestCollection(): Promise<readonly Entry[]>;
}

export interface CachePolicy {
  readonly freshMs: number;
  readonly maxAgeMs: number;
}

export interface CachedResult {
  readonly snapshot: EntrySnapshot;
  readonly delayed: boolean;
}

export class CachedEntries {
  private activeRefresh: Promise<EntrySnapshot> | undefined;
  private startup: Promise<EntrySnapshot> | undefined;
  private error: unknown = null;

  constructor(
    private readonly cache: SnapshotCache,
    private readonly collector: EntryCollector,
    private readonly policy: CachePolicy = {
      freshMs: 60_000,
      maxAgeMs: 600_000,
    },
  ) {}

  get lastError(): unknown {
    return this.error;
  }

  async get(): Promise<CachedResult> {
    const snapshot = this.cache.get();
    if (snapshot) {
      const ageMs = Date.now() - snapshot.collectedAt;
      if (ageMs < this.policy.freshMs) return { snapshot, delayed: false };
      if (ageMs < this.policy.maxAgeMs) {
        // The caller keeps its snapshot; collectSnapshot records background errors.
        void this.refresh().catch(() => {});
        return { snapshot, delayed: false };
      }
    }
    return { snapshot: await this.refresh(), delayed: true };
  }

  refresh(): Promise<EntrySnapshot> {
    if (this.activeRefresh) return this.activeRefresh;
    this.activeRefresh = this.collectSnapshot().finally(() => {
      this.activeRefresh = undefined;
    });
    return this.activeRefresh;
  }

  start(): Promise<EntrySnapshot> {
    return (this.startup ??= this.refresh());
  }

  private async collectSnapshot(): Promise<EntrySnapshot> {
    try {
      const entries = await this.collector.requestCollection();
      this.cache.replace(entries);
      this.error = null;
      return this.cache.get()!;
    } catch (error) {
      this.error = error;
      throw error;
    }
  }
}
