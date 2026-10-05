import { expect, it } from "vitest";
import { fetchPage } from "@/features/hacker-news/get-entries/scraping/collect/fetch-page";
import { parseEntries } from "@/features/hacker-news/get-entries/scraping/collect/parse-entries";

it("extracts the first 30 entries from live Hacker News", async () => {
  const html = await fetchPage();
  const entries = parseEntries(html);

  expect(entries).toHaveLength(30);
  expect(entries.map((entry) => entry.rank)).toEqual(
    Array.from({ length: 30 }, (_, index) => index + 1),
  );

  for (const entry of entries) {
    expect(entry.title.trim().length).toBeGreaterThan(0);
    for (const metric of [entry.points, entry.comments]) {
      expect(Number.isSafeInteger(metric)).toBe(true);
      expect(metric).toBeGreaterThanOrEqual(0);
    }
  }
}, 15_000);
