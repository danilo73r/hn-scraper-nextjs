import type { CountedEntry } from "./entry";
import { type EntryFilter, isLongFilter } from "./entry-filter";

const titleCollator = new Intl.Collator("en", { sensitivity: "accent" });

export function sortEntries(
  entries: readonly CountedEntry[],
  filter: EntryFilter,
): CountedEntry[] {
  return entries.toSorted((left, right) => {
    const metricDifference = isLongFilter(filter)
      ? right.comments - left.comments
      : right.points - left.points;

    if (metricDifference !== 0) {
      return metricDifference;
    }

    return titleCollator.compare(left.title, right.title);
  });
}
