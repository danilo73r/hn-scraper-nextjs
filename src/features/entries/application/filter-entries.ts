import type { CountedEntry } from "./entry";
import { type EntryFilter, isLongFilter } from "./entry-filter";

export function filterEntries(
  entries: readonly CountedEntry[],
  filter: EntryFilter,
): CountedEntry[] {
  return entries.filter((entry) => {
    return isLongFilter(filter) ? entry.wordCount > 5 : entry.wordCount <= 5;
  });
}
