"use client";

import { useEffect, useRef, useState } from "react";
import { EntryFilter } from "../entry-filter";
import { EntriesList } from "./entries-list";
import { useEntries } from "./use-entries";

export function EntriesBrowser() {
  const { filter, selectFilter, state, retry } = useEntries();
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
          onClick={() => selectFilter(EntryFilter.All)}
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
          onClick={() => selectFilter(EntryFilter.LongTitle)}
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
          onClick={() => selectFilter(EntryFilter.ShortTitle)}
        >
          <span className="filter-label">Short titles</span>
          <small className="filter-description text-xs text-muted">
            5 words or fewer · by points
          </small>
        </button>
      </div>
      <div className="stories-heading flex items-center justify-between">
        <h2 className="stories-heading-title text-sm">Stories</h2>
        {state.status === "ready" && (
          <span className="text-xs text-muted">
            {state.entries.length}{" "}
            {state.entries.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>
      <div aria-busy={state.status === "loading"}>
        {state.status === "loading" && (
          <p role="status" className="empty-stories text-center text-muted">
            Loading stories…
          </p>
        )}
        {state.status === "error" && (
          <div className="empty-stories text-center">
            <p role="alert" className="text-muted">
              Could not load stories.
            </p>
            <button
              type="button"
              className="filter-button mt-4"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        )}
        {state.status === "ready" && <EntriesList entries={state.entries} />}
      </div>
    </section>
  );
}
