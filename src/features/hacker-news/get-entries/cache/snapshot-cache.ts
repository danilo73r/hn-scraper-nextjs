import { countWords } from "../count-words";
import type { Entry } from "../entry";
import type { EntrySnapshot } from "./entry-snapshot";

export class SnapshotCache {
  private snapshot: EntrySnapshot | null = null;
  private wordCounts = new Map<string, number>();

  constructor(private readonly count: (title: string) => number = countWords) {}

  get(): EntrySnapshot | null {
    return this.snapshot;
  }

  replace(entries: readonly Entry[], collectedAt: number = Date.now()): void {
    const wordCounts = new Map<string, number>();
    const countedEntries = Object.freeze(
      entries.map((entry) => {
        const wordCount =
          wordCounts.get(entry.title) ??
          this.wordCounts.get(entry.title) ??
          this.count(entry.title);
        wordCounts.set(entry.title, wordCount);
        return Object.freeze({ ...entry, wordCount });
      }),
    );

    // Publish only after the entire snapshot has been prepared successfully.
    const snapshot = Object.freeze({
      collectedAt,
      entries: countedEntries,
    });
    this.wordCounts = wordCounts;
    this.snapshot = snapshot;
  }
}
