import type { Entry } from "../entry";
import type { EntryFilter } from "../entry-filter";

export async function fetchEntries(
  filter: EntryFilter,
  signal: AbortSignal,
): Promise<Entry[]> {
  const response = await fetch(`/api/entries?filter=${filter}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not load stories.");

  const body: { entries: Entry[] } = await response.json();
  return body.entries;
}
