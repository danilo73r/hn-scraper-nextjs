import type { CountedEntry } from "./entry";
import { EntryFilter, isLongFilter } from "./entry-filter";

export function filterEntries(
  entries: readonly CountedEntry[],
  filter: EntryFilter,
): CountedEntry[] {
  if (filter === EntryFilter.All) return [...entries];
  return entries.filter((entry) => {
    return isLongFilter(filter) ? entry.wordCount > 5 : entry.wordCount <= 5;
  });
}
