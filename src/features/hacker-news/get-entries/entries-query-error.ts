import { ScrapingRequestError } from "./scraping/scraping-request-error";
import { ScrapingParseError } from "./scraping/scraping-parse-error";

type EntriesErrorCode =
  | "REQUEST_TIMEOUT"
  | "USAGE_PERSISTENCE_ERROR"
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PARSE_ERROR"
  | "INTERNAL_ERROR";

export class EntriesQueryError extends Error {
  constructor(
    readonly code: EntriesErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = "EntriesQueryError";
  }
}

export function toEntriesQueryError(error: unknown): EntriesQueryError {
  if (error instanceof EntriesQueryError) return error;
  if (error instanceof ScrapingRequestError)
    return new EntriesQueryError(error.code, error);
  if (error instanceof ScrapingParseError)
    return new EntriesQueryError("PARSE_ERROR", error);
  return new EntriesQueryError("INTERNAL_ERROR", error);
}
