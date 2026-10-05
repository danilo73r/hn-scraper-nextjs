import type { EntryFilter } from "../entry-filter";

interface UsageDetails {
  readonly requestedAt: Date;
  readonly filter: EntryFilter;
  readonly resultCount: number;
  readonly delayed: boolean;
}

export type UsageEvent = UsageDetails &
  (
    | { readonly outcome: "success"; readonly errorCode: null }
    | { readonly outcome: "failure"; readonly errorCode: string }
  );
