import { describe, expect, inject, it } from "vitest";
import { parseEntries } from "@/features/hacker-news/get-entries/scraping/collect/parse-entries";
import { ScrapingParseError } from "@/features/hacker-news/get-entries/scraping/scraping-parse-error";

const { html } = inject("parserFixtures");

describe("parseEntries points", () => {
  it("returns zero when the score element is absent on a regular submission", () => {
    const htmlWithoutScore = html.replace(
      /<span class="score"[^>]*>[\s\S]*?<\/span>/u,
      "",
    );

    const entries = parseEntries(htmlWithoutScore);

    expect(entries[0].points).toBe(0);
  });

  it.each([
    {
      scenario: "non-numeric points",
      original: "120 points",
      replacement: "many points",
    },
    { scenario: "empty points", original: "120 points", replacement: "" },
    {
      scenario: "invalid points label",
      original: "120 points",
      replacement: "120 votes",
    },
    {
      scenario: "points without a separator",
      original: "120 points",
      replacement: "120points",
    },
    {
      scenario: "negative points",
      original: "120 points",
      replacement: "-1 points",
    },
    {
      scenario: "decimal points",
      original: "120 points",
      replacement: "1.5 points",
    },
    {
      scenario: "extra text in points",
      original: "120 points",
      replacement: "120 points extra",
    },
    {
      scenario: "unsafe points",
      original: "120 points",
      replacement: "9007199254740992 points",
    },
  ])("rejects $scenario", ({ original, replacement }) => {
    const invalidHtml = html.replace(original, replacement);

    expect(() => parseEntries(invalidHtml)).toThrow(ScrapingParseError);
  });
});
