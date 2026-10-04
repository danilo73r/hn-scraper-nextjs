import type { CountedEntry } from "./entry";

export type EntryFilter = "long-title" | "short-title";

export function filterEntries(
  entries: readonly CountedEntry[],
  filter: EntryFilter,
): CountedEntry[] {
  return entries.filter((entry) => {
    const isLongFilter = filter === "long-title";
    return isLongFilter ? entry.wordCount > 5 : entry.wordCount <= 5;
  });
}
