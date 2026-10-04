import type { CountedEntry } from "./entry";
import { EntryFilter } from "./entry-filter";

export function filterEntries(
  entries: readonly CountedEntry[],
  filter: EntryFilter,
): CountedEntry[] {
  return entries.filter((entry) => {
    const isLongFilter = filter === EntryFilter.LongTitle;
    return isLongFilter ? entry.wordCount > 5 : entry.wordCount <= 5;
  });
}
