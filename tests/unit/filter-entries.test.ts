import { describe, expect, it } from "vitest";
import type { CountedEntry } from "@/features/entries/application/entry";
import { EntryFilter } from "@/features/entries/application/entry-filter";
import { filterEntries } from "@/features/entries/application/filter-entries";

const shortEntry: CountedEntry = {
  rank: 1,
  title: "A short news title",
  points: 10,
  comments: 20,
  wordCount: 4,
};

const fiveWordEntry: CountedEntry = {
  rank: 2,
  title: "This title has five words",
  points: 10,
  comments: 20,
  wordCount: 5,
};

const longEntry: CountedEntry = {
  rank: 3,
  title: "This news title has six words",
  points: 10,
  comments: 20,
  wordCount: 6,
};

const anotherLongEntry: CountedEntry = {
  rank: 4,
  title: "Another news title with seven total words",
  points: 10,
  comments: 20,
  wordCount: 7,
};

const entries: readonly CountedEntry[] = [
  shortEntry,
  longEntry,
  fiveWordEntry,
  anotherLongEntry,
];

describe("filterEntries", () => {
  it("uses the supplied word count instead of calculating it from title", () => {
    const entry: CountedEntry = {
      rank: 1,
      title: "cached title", // 2 words
      points: 0,
      comments: 0,
      wordCount: 6, // 6 words
    };

    expect(filterEntries([entry], EntryFilter.LongTitle)).toEqual([entry]);
    expect(filterEntries([entry], EntryFilter.ShortTitle)).toEqual([]);
  });

  it("selects titles with more than five words", () => {
    expect(filterEntries(entries, EntryFilter.LongTitle)).toEqual([
      longEntry,
      anotherLongEntry,
    ]);
  });

  it("selects titles with five words or fewer", () => {
    expect(filterEntries(entries, EntryFilter.ShortTitle)).toEqual([
      shortEntry,
      fiveWordEntry,
    ]);
  });

  it.each([EntryFilter.LongTitle, EntryFilter.ShortTitle])(
    "returns no entries for an empty list with %s",
    (filter) => {
      expect(filterEntries([], filter)).toEqual([]);
    },
  );

  it("returns no entries when no titles match", () => {
    expect(filterEntries([shortEntry], EntryFilter.LongTitle)).toEqual([]);
    expect(filterEntries([longEntry], EntryFilter.ShortTitle)).toEqual([]);
  });

  it("does not modify the original entries", () => {
    const original = entries.map((entry) => ({ ...entry }));
    const frozenEntries = Object.freeze(
      entries.map((entry) => Object.freeze({ ...entry })),
    );

    filterEntries(frozenEntries, EntryFilter.LongTitle);
    filterEntries(frozenEntries, EntryFilter.ShortTitle);

    expect(frozenEntries).toEqual(original);
  });
});
