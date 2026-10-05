import { describe, expect, it } from "vitest";
import type { CountedEntry } from "@/features/hacker-news/get-entries/entry";
import { EntryFilter } from "@/features/hacker-news/get-entries/entry-filter";
import { sortEntries } from "@/features/hacker-news/get-entries/sort-entries";

const longEntry: CountedEntry = {
  rank: 1,
  title: "This news title has six words",
  points: 0,
  comments: 0,
  wordCount: 6,
};

const shortEntry: CountedEntry = {
  rank: 2,
  title: "Short news title",
  points: 0,
  comments: 0,
  wordCount: 3,
};

describe("sortEntries", () => {
  it("keeps the original order for all, regardless of metrics", () => {
    const entries = [
      { ...longEntry, points: 1, comments: 1 },
      { ...shortEntry, points: 100, comments: 100 },
    ];
    expect(sortEntries(entries, EntryFilter.All)).toEqual(entries);
  });
  it("sorts long titles by comments descending before titles or points", () => {
    const lowCommentsEntry = {
      ...longEntry,
      title: "Alpha news title with six words",
      comments: 1,
      points: 100,
    };
    const highCommentsEntry = {
      ...longEntry,
      title: "Zebra news title with six words",
      comments: 20,
      points: 1,
    };
    const zeroCommentsEntry = { ...longEntry, comments: 0, points: 50 };

    expect(
      sortEntries(
        [lowCommentsEntry, zeroCommentsEntry, highCommentsEntry],
        EntryFilter.LongTitle,
      ),
    ).toEqual([highCommentsEntry, lowCommentsEntry, zeroCommentsEntry]);
  });

  it("sorts short titles by points descending before titles or comments", () => {
    const lowPointsEntry = {
      ...shortEntry,
      title: "Alpha short title",
      points: 1,
      comments: 100,
    };
    const highPointsEntry = {
      ...shortEntry,
      title: "Zebra short title",
      points: 20,
      comments: 1,
    };
    const zeroPointsEntry = { ...shortEntry, points: 0, comments: 50 };

    expect(
      sortEntries(
        [lowPointsEntry, zeroPointsEntry, highPointsEntry],
        EntryFilter.ShortTitle,
      ),
    ).toEqual([highPointsEntry, lowPointsEntry, zeroPointsEntry]);
  });

  it.each([EntryFilter.LongTitle, EntryFilter.ShortTitle])(
    "breaks metric ties by title A–Z, ignoring case, with %s",
    (filter) => {
      const baseEntry =
        filter === EntryFilter.LongTitle ? longEntry : shortEntry;
      const alphaEntry = { ...baseEntry, title: "alpha" };
      const betaEntry = { ...baseEntry, title: "Beta" };
      const zebraEntry = { ...baseEntry, title: "Zebra" };

      expect(sortEntries([zebraEntry, betaEntry, alphaEntry], filter)).toEqual([
        alphaEntry,
        betaEntry,
        zebraEntry,
      ]);
    },
  );

  it.each([EntryFilter.LongTitle, EntryFilter.ShortTitle])(
    "keeps the original order for complete ties without using rank, with %s",
    (filter) => {
      const baseEntry =
        filter === EntryFilter.LongTitle ? longEntry : shortEntry;
      const firstEntry = { ...baseEntry, rank: 20, title: "Same title" };
      const secondEntry = { ...baseEntry, rank: 1, title: "SAME TITLE" };

      expect(sortEntries([firstEntry, secondEntry], filter)).toEqual([
        firstEntry,
        secondEntry,
      ]);
      expect(sortEntries([secondEntry, firstEntry], filter)).toEqual([
        secondEntry,
        firstEntry,
      ]);
    },
  );

  it.each([EntryFilter.LongTitle, EntryFilter.ShortTitle])(
    "returns an empty list for %s when there are no entries",
    (filter) => {
      expect(sortEntries([], filter)).toEqual([]);
    },
  );

  it.each([EntryFilter.LongTitle, EntryFilter.ShortTitle])(
    "does not modify the input array or its entries with %s",
    (filter) => {
      const baseEntry =
        filter === EntryFilter.LongTitle ? longEntry : shortEntry;
      const firstEntry = Object.freeze({ ...baseEntry, title: "Zebra" });
      const secondEntry = Object.freeze({ ...baseEntry, title: "alpha" });
      const entries = Object.freeze([firstEntry, secondEntry]);

      expect(sortEntries(entries, filter)).toEqual([secondEntry, firstEntry]);
      expect(entries).toEqual([firstEntry, secondEntry]);
    },
  );
});
