export const EntryFilter = {
  LongTitle: "long-title",
  ShortTitle: "short-title",
} as const;

export type EntryFilter = (typeof EntryFilter)[keyof typeof EntryFilter];

export function isLongFilter(filter: EntryFilter): boolean {
  return filter === EntryFilter.LongTitle;
}
