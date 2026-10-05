import { describe, expect, inject, it } from "vitest";
import { parseEntries } from "@/features/hacker-news/get-entries/scraping/parse-entries";
import { ScrapingParseError } from "@/features/hacker-news/get-entries/scraping/scraping-parse-error";

const { html, htmlWithMissingMetrics } = inject("parserFixtures");

describe("parseEntries extraction and HTML structure", () => {
  it("extracts rank, title, points, and comments in page order", () => {
    const entries = parseEntries(html);

    expect(entries).toEqual([
      { rank: 1, title: "Rust & WebAssembly", points: 120, comments: 35 },
      { rank: 2, title: "A small database", points: 7, comments: 1 },
      { rank: 3, title: "Show HN: Café tools", points: 1, comments: 12 },
    ]);
  });

  it("returns zero comments for discuss, and zero points if score is not present", () => {
    const entries = parseEntries(htmlWithMissingMetrics);

    expect(entries).toEqual([
      { rank: 1, title: "A new security report", points: 15, comments: 0 },
      { rank: 2, title: "Example company is hiring", points: 0, comments: 0 },
    ]);
  });

  it("accepts explicit zero points and comments", () => {
    const htmlWithZeroMetrics = html
      .replace("120 points", "0 points")
      .replace("35&nbsp;comments", "0&nbsp;comments");

    const entries = parseEntries(htmlWithZeroMetrics);

    expect(entries[0]).toEqual({
      rank: 1,
      title: "Rust & WebAssembly",
      points: 0,
      comments: 0,
    });
  });

  it("returns an empty array when the main container has no submissions", () => {
    const htmlWithoutSubmissions =
      '<table id="hnmain"><tr><td>No submissions</td></tr></table>';

    const entries = parseEntries(htmlWithoutSubmissions);

    expect(entries).toEqual([]);
  });

  it.each([
    { scenario: "an empty document", document: "" },
    {
      scenario: "a missing main container",
      document: html.replace('id="hnmain"', 'id="changed-container"'),
    },
    {
      scenario: "missing metadata",
      document: html.replace('class="subtext"', 'class="changed-metadata"'),
    },
  ])("rejects $scenario", ({ document }) => {
    expect(() => parseEntries(document)).toThrow(ScrapingParseError);
  });
});
