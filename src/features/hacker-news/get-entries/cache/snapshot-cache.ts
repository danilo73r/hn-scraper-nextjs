import { countWords } from "../count-words";
import type { Entry } from "../entry";
import type { EntrySnapshot } from "./entry-snapshot";

export class SnapshotCache {
  private snapshot: EntrySnapshot | null = null;

  constructor(private readonly count: (title: string) => number = countWords) {}

  get(): EntrySnapshot | null {
    return this.snapshot;
  }

  replace(entries: readonly Entry[], collectedAt: number = Date.now()): void {
    const countedEntries = Object.freeze(
      entries.map((entry) =>
        Object.freeze({ ...entry, wordCount: this.count(entry.title) }),
      ),
    );

    // Publish only after the entire snapshot has been prepared successfully.
    this.snapshot = Object.freeze({
      collectedAt,
      entries: countedEntries,
    });
  }
}
