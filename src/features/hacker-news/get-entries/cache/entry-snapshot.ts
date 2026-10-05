import type { CountedEntry } from "../entry";

export interface EntrySnapshot {
  readonly collectedAt: number;
  readonly entries: readonly CountedEntry[];
}
