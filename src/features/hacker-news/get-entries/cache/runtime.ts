import { CachedEntries } from "./cached-entries";
import { SnapshotCache } from "./snapshot-cache";
import { readCachePolicy } from "./cache-policy";
import { getCollectorWorker } from "../scraping/collector-worker";

const processState = globalThis as typeof globalThis & {
  hackerNewsCachedEntries?: CachedEntries;
};

// Share the cache, refresh and startup operation across callers in this process.
export function getCachedEntries(): CachedEntries {
  return (processState.hackerNewsCachedEntries ??= new CachedEntries(
    new SnapshotCache(),
    getCollectorWorker(),
    readCachePolicy(),
  ));
}
