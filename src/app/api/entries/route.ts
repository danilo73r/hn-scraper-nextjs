import { isEntryFilter } from "@/features/hacker-news/get-entries/entry-filter";
import { EntriesQueryError } from "@/features/hacker-news/get-entries/entries-query-error";
import { getEntriesQuery } from "@/features/hacker-news/get-entries/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const errorStatuses: Record<EntriesQueryError["code"], number> = {
  REQUEST_TIMEOUT: 504,
  USAGE_PERSISTENCE_ERROR: 503,
  HTTP_ERROR: 502,
  NETWORK_ERROR: 502,
  TIMEOUT: 504,
  PARSE_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export async function GET(request: Request): Promise<Response> {
  const filters = new URL(request.url).searchParams.getAll("filter");
  const filter = filters[0];
  if (filters.length !== 1 || !isEntryFilter(filter)) {
    return Response.json(
      {
        error: {
          code: "INVALID_FILTER",
          message: "Use filter=all, filter=long-title or filter=short-title.",
        },
      },
      { status: 400, headers },
    );
  }

  try {
    const entries = await getEntriesQuery().execute(filter);
    return Response.json({ entries }, { headers });
  } catch (error) {
    console.error("Entries request failed.", error);
    const code =
      error instanceof EntriesQueryError ? error.code : "INTERNAL_ERROR";
    return Response.json(
      { error: { code, message: "Could not retrieve entries." } },
      { status: errorStatuses[code], headers },
    );
  }
}
