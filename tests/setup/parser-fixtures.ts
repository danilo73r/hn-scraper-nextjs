import { readFileSync } from "node:fs";
import type { TestProject } from "vitest/node";

export default function setup(project: TestProject): void {
  // Read once before workers start; Vitest sends the text to each worker.
  project.provide("parserFixtures", {
    html: readFileSync(
      new URL("../fixtures/hacker-news.html", import.meta.url),
      "utf8",
    ),
    htmlWithMissingMetrics: readFileSync(
      new URL("../fixtures/hacker-news-missing-metrics.html", import.meta.url),
      "utf8",
    ),
  });
}

declare module "vitest" {
  export interface ProvidedContext {
    parserFixtures: {
      html: string;
      htmlWithMissingMetrics: string;
    };
  }
}
