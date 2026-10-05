import { describe, expect, inject, it } from "vitest";
import { parseEntries } from "@/features/hacker-news/get-entries/scraping/collect/parse-entries";
import { ScrapingParseError } from "@/features/hacker-news/get-entries/scraping/scraping-parse-error";

const { html } = inject("parserFixtures");

describe("parseEntries rank", () => {
  it("accepts rank with a leading zero", () => {
    const htmlWithLeadingZero = html.replace("1.</span>", "01.</span>");
    const entries = parseEntries(htmlWithLeadingZero);

    expect(entries[0].rank).toBe(1);
  });

  it("rejects a submission with missing rank", () => {
    const invalidHtml = html.replace('class="rank"', 'class="changed-rank"');

    expect(() => parseEntries(invalidHtml)).toThrow(ScrapingParseError);
  });

  it.each([
    {
      scenario: "zero rank",
      original: "1.</span>",
      replacement: "0.</span>",
    },
    {
      scenario: "rank without a final dot",
      original: "1.</span>",
      replacement: "12</span>",
    },
    {
      scenario: "decimal rank",
      original: "1.</span>",
      replacement: "1.5.</span>",
    },
    {
      scenario: "negative rank",
      original: "1.</span>",
      replacement: "-1.</span>",
    },
    {
      scenario: "invalid rank format",
      original: "1.</span>",
      replacement: "1.invalid</span>",
    },
    {
      scenario: "rank containing letters",
      original: "1.</span>",
      replacement: "a1.</span>",
    },
    {
      scenario: "unsafe rank",
      original: "1.</span>",
      replacement: "9007199254740992.</span>",
    },
    {
      scenario: "rank without digits",
      original: "1.</span>",
      replacement: ".</span>",
    },
  ])("rejects $scenario", ({ original, replacement }) => {
    const invalidHtml = html.replace(original, replacement);

    expect(() => parseEntries(invalidHtml)).toThrow(ScrapingParseError);
  });
});
