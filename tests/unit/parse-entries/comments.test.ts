import { load } from "cheerio";
import { describe, expect, inject, it } from "vitest";
import { parseEntries } from "@/features/hacker-news/get-entries/scraping/parse-entries";
import { ScrapingParseError } from "@/features/hacker-news/get-entries/scraping/scraping-parse-error";

const { html } = inject("parserFixtures");
const commentsLink = '<a href="item?id=1001">35&nbsp;comments</a>';
const ageLink = '<a href="item?id=1001">99 minutes ago</a>';
const hideLink = '<a href="hide?id=1001">hide</a>';

describe("parseEntries comments", () => {
  it.each([
    { position: "first", links: [commentsLink, ageLink, hideLink] },
    { position: "in the middle", links: [ageLink, commentsLink, hideLink] },
    { position: "last", links: [ageLink, hideLink, commentsLink] },
  ])("extracts comments at any link position: $position", ({ links }) => {
    const $ = load(html);
    $(".subtext")
      .first()
      .html('<span class="score">120 points</span>' + links.join(" | "));

    const entries = parseEntries($.html());

    expect(entries.map((entry) => entry.comments)).toEqual([35, 1, 12]);
  });

  it("returns zero when neither a comment count nor discuss is present", () => {
    const htmlWithoutComments = html.replace("35&nbsp;comments", "");

    const entries = parseEntries(htmlWithoutComments);

    expect(entries[0].comments).toBe(0);
  });

  it.each([
    {
      scenario: "non-numeric comments",
      original: "35&nbsp;comments",
      replacement: "many&nbsp;comments",
    },
    {
      scenario: "invalid comments label",
      original: "35&nbsp;comments",
      replacement: "35&nbsp;commentsExtra",
    },
    {
      scenario: "comments without a separator",
      original: "35&nbsp;comments",
      replacement: "35comments",
    },
    {
      scenario: "negative comments",
      original: "35&nbsp;comments",
      replacement: "-1&nbsp;comments",
    },

    {
      scenario: "decimal comments",
      original: "35&nbsp;comments",
      replacement: "1.5&nbsp;comments",
    },
    {
      scenario: "extra text in comments",
      original: "35&nbsp;comments",
      replacement: "35&nbsp;comments extra",
    },
    {
      scenario: "unsafe comments",
      original: "35&nbsp;comments",
      replacement: "9007199254740992&nbsp;comments",
    },
  ])("rejects $scenario", ({ original, replacement }) => {
    const invalidHtml = html.replace(original, replacement);

    expect(() => parseEntries(invalidHtml)).toThrow(ScrapingParseError);
  });
});
