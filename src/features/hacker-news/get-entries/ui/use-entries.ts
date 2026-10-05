"use client";

import { useEffect, useState } from "react";
import type { Entry } from "../entry";
import { EntryFilter } from "../entry-filter";
import { fetchEntries } from "./entries-client";

type EntriesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; entries: Entry[] };

export function useEntries() {
  const [filter, setFilter] = useState<EntryFilter>(EntryFilter.All);
  const [state, setState] = useState<EntriesState>({ status: "loading" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchEntries(filter, controller.signal)
      .then((entries) => {
        if (!controller.signal.aborted) setState({ status: "ready", entries });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });

    // An old response must never replace the latest filter's results.
    return () => controller.abort();
  }, [filter, retryCount]);

  function selectFilter(nextFilter: EntryFilter) {
    if (nextFilter === filter) return;
    setState({ status: "loading" });
    setFilter(nextFilter);
  }

  function retry() {
    setState({ status: "loading" });
    setRetryCount((count) => count + 1);
  }

  return { filter, selectFilter, state, retry };
}
