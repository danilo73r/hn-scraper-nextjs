# Key Design Decisions

## Architecture

The architecture is simple but can evolve based on measured performance and identified bottlenecks.

- Next.js application, organized by feature with vertical slices.
- Scraping, caching, filtering, and persistence have separated responsibilities.
- A background worker (in the same API process) will be used to scrape data from Hacker News.


## Scraping

The worker performs a scraping operation: it downloads the Hacker News page and builds a snapshot of the first 30 entries. Snapshots are cached in memory, not stored in PostgreSQL. They are replaced atomically.

- The worker fetches data from a fixed HTTPS URL with redirects blocked and a timeout.
- The html parser will normalize missing points and comments to 0.
- Cheerio parses the HTML and validates the first 30 entries.
- The worker respects the 30s crawl delay, it waits at least 60s between scraping attempts.
    - https://news.ycombinator.com/robots.txt
- The number of words is computed ahead of time and stored in a field.
- Word counts are reused using a dictionary limited to current titles.
- The worker scrapes once at startup.

### Cache and Concurrency

- Concurrent requests can only trigger a single scraping operation.
- The operation stays in progress during retry waits; requests reuse its cache or wait for the same operation with their own timeout.
- Cache expiration and return policy for requests:
    - A. Cache under 60s old:
        - Return cached data. 
    - B. Cache between 60s and 10min old:
        - Cached data is returned, and a scraping operation starts.
        - On success, the snapshot is replaced and the cache age resets.
    - C. Cache over 10min old or empty:
        - The request waits for the scraping operation to finish.
        - The wait is limited by the request timeout.
- Both time limits (60s and 10min) are configurable defaults.


### Scraping Error Handling

- Scraping and API requests have seprate timeouts.
- The cache tracks errors in its state:
    - Scraping timeouts
    - External service errors
    - Exhausted retries
    - Parsing errors
- This state includes an error code to identify the failure.
- The error state is cleared only after a successful refresh.
- Retries:
    - Collection (fetch and parse) makes up to 3 attempts, waiting 60s between retries.
    - Network failures, download timeouts, and HTTP 500, 502, 503, 504 trigger retries.
    - Parsing errors and other HTTP errors end collection without retries, except HTTP 429.
    - HTTP 429 waits for `Retry-After`, bounded between 60s and 1h, or 5min if missing or invalid. Values above 1h are capped, so retries may occur before the server's requested time.
    - Different error types share the same attempt limit.


## Usage Data

- Usage data is stored in PostgreSQL, including:
    - Timestamp: Request timestamp
    - Filter: The code of the applied filter
    - Result count: the number of entries returned.
    - Delayed: whether the request waited for scraping.
    - Outcome: success or failure.
    - Error code: the failure code, or null on success.
- Persistence completes before a successful response is returned.
- Background writes could reduce latency using an in-memory queue (data loss risk) or a durable queue (persistent storage).


## Filtering

- Both filters use the same snapshot.
- Use titles as a secondary sorting criterion.
- Descending order by default.

## Testing

- Unit tests: 
    - Word counting
    - Filtering and sorting
    - HTML parsing
    - Scraping rules
- Integration tests:
    - API behavior
    - Cache refreshes
    - Concurrent requests
    - Usage records in PostgreSQL
- Live integration test against Hacker news: 
    - Verifies extraction of the fields from the first 30 entries.
    - This test depends on an external service, so consider carefully before adding it to CI.


## Performance

- k6 measures response latency and requests per second.
- Tests cover cache policies A, B, and C, including timeouts.
- Operation timings help identify bottlenecks:
    - Downloading
    - Parsing
    - Filtering
    - Usage persistence
- Performance tests run against the production build.
