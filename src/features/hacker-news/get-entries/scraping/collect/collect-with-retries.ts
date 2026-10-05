import type { Entry } from "../../entry";
import { fetchPage } from "./fetch-page";
import { parseEntries } from "./parse-entries";
import { getRetryDelayMs, maxCollectionAttempts } from "./retry-policy";
import { ScrapingRequestError } from "../scraping-request-error";
import { setTimeout as sleep } from "node:timers/promises";

export async function collectWithRetries(): Promise<Entry[]> {
  for (let attempt = 1; ; attempt++) {
    let html: string;

    try {
      html = await fetchPage();
    } catch (error) {
      if (!(error instanceof ScrapingRequestError)) throw error;

      const delayMs = getRetryDelayMs(error);
      if (attempt >= maxCollectionAttempts || delayMs === null) throw error;

      await sleep(delayMs);
      continue;
    }

    return parseEntries(html);
  }
}
