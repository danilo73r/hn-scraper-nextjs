export const EntryFilter = {
  LongTitle: "long-title",
  ShortTitle: "short-title",
} as const;

export type EntryFilter = (typeof EntryFilter)[keyof typeof EntryFilter];
