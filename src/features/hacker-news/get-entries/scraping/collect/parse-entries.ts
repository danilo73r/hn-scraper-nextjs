import { type CheerioAPI, load } from "cheerio";
import type { Entry } from "../../entry";
import { ScrapingParseError } from "../scraping-parse-error";

type HtmlElement = ReturnType<CheerioAPI>;

export function parseEntries(html: string): Entry[] {
  const $ = load(html);
  const container = requireOne($("#hnmain"), "main container");
  const rows = container.find("tr.athing.submission");

  return rows.toArray().map((rowElement) => {
    const row = $(rowElement);
    const metadata = requireOne(row.next("tr").find(".subtext"), "metadata");

    return {
      rank: getRank(row),
      title: getTitle(row),
      points: getPoints(metadata),
      comments: getComments($, metadata),
    };
  });
}

function getRank(row: HtmlElement): number {
  const rank = requireOne(row.find(".rank"), "rank");
  const text = rank.text().trim();

  if (text.length === 0) {
    throw new ScrapingParseError("Empty Hacker News rank.");
  }

  if (!text.endsWith(".")) {
    throw new ScrapingParseError(`Invalid Hacker News rank: ${text}.`);
  }

  const rankNumber = Number(text.slice(0, -1));

  if (!Number.isSafeInteger(rankNumber) || rankNumber <= 0) {
    throw new ScrapingParseError(`Invalid Hacker News rank: ${text}.`);
  }

  return rankNumber;
}

function getTitle(row: HtmlElement): string {
  const titleElement = requireOne(row.find(".titleline > a"), "title");
  const title = titleElement.text().trim();

  if (title.length === 0) {
    throw new ScrapingParseError("Empty Hacker News title.");
  }

  return title;
}

function getPoints(metadata: HtmlElement): number {
  const score = metadata.find(".score");

  if (score.length === 0) {
    return 0;
  }

  const text = requireOne(score, "points").text().trim();
  const parts = text.split(" ");
  const pointsNumber = Number(parts[0]);

  const isValidFormat = parts.length === 2;
  const isValidNumber = Number.isSafeInteger(pointsNumber) && pointsNumber >= 0;
  const isValidLabel = parts[1] === "point" || parts[1] === "points";

  if (!isValidFormat || !isValidLabel || !isValidNumber) {
    throw new ScrapingParseError(`Invalid Hacker News points: ${text}.`);
  }

  return pointsNumber;
}

function getComments($: CheerioAPI, metadata: HtmlElement): number {
  const text = metadata
    .find("a")
    .toArray()
    .map((link) => $(link).text().trim())
    .findLast((text) => text === "discuss" || text.includes("comment"));

  if (text === undefined || text === "discuss") {
    return 0;
  }

  const parts = text.split("\u00A0");
  const comments = Number(parts[0]);

  const isValidFormat = parts.length === 2;
  const isValidNumber = Number.isSafeInteger(comments) && comments >= 0;
  const isValidLabel = parts[1] === "comment" || parts[1] === "comments";

  if (!isValidFormat || !isValidLabel || !isValidNumber) {
    throw new ScrapingParseError(`Invalid Hacker News comments: ${text}.`);
  }

  return comments;
}

function requireOne(selection: HtmlElement, field: string): HtmlElement {
  if (selection.length !== 1) {
    throw new ScrapingParseError(`Expected an HTML element: ${field}`);
  }

  return selection;
}
