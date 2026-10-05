import { describe, expect, inject, it } from "vitest";
import { parseEntries } from "@/features/hacker-news/get-entries/scraping/parse-entries";
import { ScrapingParseError } from "@/features/hacker-news/get-entries/scraping/scraping-parse-error";

const { html } = inject("parserFixtures");

describe("parseEntries title", () => {
  it("extracts plain title text, decodes entities, and trims whitespace", () => {
    const htmlWithFormattedTitle = html.replace(
      "Rust &amp; WebAssembly",
      "  Café &amp; <em>tools</em>  ",
    );

    const entries = parseEntries(htmlWithFormattedTitle);

    expect(entries[0].title).toBe("Café & tools");
  });

  it.each([
    {
      scenario: "a missing title",
      original: 'class="titleline"',
      replacement: 'class="changed-title"',
    },
    {
      scenario: "an empty title",
      original: "Rust &amp; WebAssembly",
      replacement: "   ",
    },
    {
      scenario: "multiple title links for one entry",
      original: "Rust &amp; WebAssembly",
      replacement:
        'Rust &amp; WebAssembly</a><a href="https://example.com/extra">Extra title',
    },
  ])("rejects $scenario", ({ original, replacement }) => {
    const invalidHtml = html.replace(original, replacement);

    expect(() => parseEntries(invalidHtml)).toThrow(ScrapingParseError);
  });
});
