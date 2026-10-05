"use client";

import { useState } from "react";
import type { Entry } from "../entry";
import { EntryFilter } from "../entry-filter";
import { EntriesList } from "./entries-list";

export function EntriesBrowser({
  entries = [],
}: {
  entries?: readonly Entry[];
}) {
  const [filter, setFilter] = useState<EntryFilter>(EntryFilter.LongTitle);

  return (
    <section
      aria-label="Browse stories"
      className="stories-panel overflow-hidden rounded-2xl"
    >
      <div
        className="entry-filters flex gap-3"
        role="group"
        aria-label="Title length"
      >
        <button
          type="button"
          className="filter-button"
          aria-pressed={filter === EntryFilter.LongTitle}
          onClick={() => setFilter(EntryFilter.LongTitle)}
        >
          <span className="filter-label block text-base">Long titles</span>
          <small className="filter-description block text-xs text-muted">
            More than 5 words · by comments
          </small>
        </button>
        <button
          type="button"
          className="filter-button"
          aria-pressed={filter === EntryFilter.ShortTitle}
          onClick={() => setFilter(EntryFilter.ShortTitle)}
        >
          <span className="filter-label block text-base">Short titles</span>
          <small className="filter-description block text-xs text-muted">
            5 words or fewer · by points
          </small>
        </button>
      </div>
      <div className="stories-heading flex items-center justify-between">
        <h2 className="stories-heading-title text-sm">Stories</h2>
        <span className="text-xs text-muted">{entries.length} entries</span>
      </div>
      <EntriesList entries={entries} />
    </section>
  );
}
