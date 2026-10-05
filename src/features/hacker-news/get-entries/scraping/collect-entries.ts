import type { Entry } from "../entry";
import { fetchPage } from "./fetch-page";
import { parseEntries } from "./parse-entries";

export async function collectEntries(timeoutMs: number): Promise<Entry[]> {
  const html = await fetchPage(timeoutMs);
  return parseEntries(html);
}
