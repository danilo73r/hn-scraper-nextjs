export const EntryFilter = {
  All: "all",
  LongTitle: "long-title",
  ShortTitle: "short-title",
} as const;

export type EntryFilter = (typeof EntryFilter)[keyof typeof EntryFilter];

export function isEntryFilter(value: unknown): value is EntryFilter {
  return (
    value === EntryFilter.All ||
    value === EntryFilter.LongTitle ||
    value === EntryFilter.ShortTitle
  );
}

export function isLongFilter(filter: EntryFilter): boolean {
  return filter === EntryFilter.LongTitle;
}
