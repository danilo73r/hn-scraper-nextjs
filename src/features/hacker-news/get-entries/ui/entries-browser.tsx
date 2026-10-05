"use client";

import { useEffect, useRef, useState } from "react";
import type { Entry } from "../entry";
import { EntryFilter } from "../entry-filter";
import { EntriesList } from "./entries-list";

export function EntriesBrowser({
  entries = [],
}: {
  entries?: readonly Entry[];
}) {
  const [filter, setFilter] = useState<EntryFilter>(EntryFilter.All);
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const updateSticky = () => {
      setIsSticky(sentinel.getBoundingClientRect().top < 0);
    };
    updateSticky();
    window.addEventListener("scroll", updateSticky, { passive: true });
    window.addEventListener("resize", updateSticky);
    return () => {
      window.removeEventListener("scroll", updateSticky);
      window.removeEventListener("resize", updateSticky);
    };
  }, []);

  return (
    <section aria-label="Browse stories" className="stories-panel rounded-2xl">
      <div ref={sentinelRef} className="filter-sentinel" aria-hidden="true" />
      <div
        className="entry-filters flex"
        data-sticky={isSticky}
        role="group"
        aria-label="Title length"
      >
        <button
          type="button"
          className="filter-button"
          aria-pressed={filter === EntryFilter.All}
          onClick={() => setFilter(EntryFilter.All)}
        >
          <span className="filter-label">All</span>
          <small className="filter-description text-xs text-muted">
            All stories · original order
          </small>
        </button>
        <button
          type="button"
          className="filter-button"
          aria-pressed={filter === EntryFilter.LongTitle}
          onClick={() => setFilter(EntryFilter.LongTitle)}
        >
          <span className="filter-label">Long titles</span>
          <small className="filter-description text-xs text-muted">
            More than 5 words · by comments
          </small>
        </button>
        <button
          type="button"
          className="filter-button"
          aria-pressed={filter === EntryFilter.ShortTitle}
          onClick={() => setFilter(EntryFilter.ShortTitle)}
        >
          <span className="filter-label">Short titles</span>
          <small className="filter-description text-xs text-muted">
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
