# Key Design Decisions

## Architecture

The architecture is simple but can evolve based on measured performance and identified bottlenecks.

- Next.js application, organized by feature with vertical slices.
- API, application, and infrastructure responsibilities are separated within the single project.
- Scraping, caching, filtering, and persistence have separated responsibilities.
- A background worker (in the same API process) will be used to scrape data from Hacker News.


## Scraping

- Fetch from a fixed HTTPS URL with redirects blocked and a timeout.
- Parse with Cheerio and validate the first 30 entries.
- Respect the robots.txt delay of 30s using 60s by default.
    - https://news.ycombinator.com/robots.txt
- Run at startup, and when an expired cache is requested.

### Cache and Concurrency

- Cache snapshots in memory and replace them atomically.
- Compute the number of words (ahead of time) as a field.
- Reuse word counts in a dictionary limited to current titles.
- Concurrent requests trigger a single cache refresh (one scraping).
- Return policy for requests:
    - A. Cache under 60s old: return cached data. 
    - B. Cache between 60s and 10min old: return cached data and start scraping. A successful refresh resets the cache age.
    - C. Cache over 10min old or missing: wait for scraping, within the request timeout.
    - Both time limits (60s and 10min) are samples and can be configurable.


### Scraping Error Handling

- Set timeouts for scraping and API requests.
- Inside cache error state, track:
    - scraping timeouts
    - external errors
    - exhausted retries
    - parsing errors
- Use that state to return an error message to the user.
- Clear the error state only after a successful refresh.


## Usage Data

- Store request timestamps and applied filters in PostgreSQL. Also include:
    - result count: the number of entries returned
    - delayed: whether the request waited for scraping
    - outcome: the request result: success or failure
    - error code: failure code, it is null on success
- Await persistence before returning a successful response.
- Background writes could reduce latency using an in-memory queue (data loss risk) or a durable queue (preserving data).


## Filtering

- Use titles as a second sorting criterion.

## Testing

- Unit tests: word counting, filtering, sorting, HTML parsing, and scraping rules with simulated responses and time.
- Integration tests: API behavior, cache refreshes, concurrent requests, and PostgreSQL usage records. 
- Integration test against Hacker news: verify extraction of the fields of 30 entries. If this test is added to a CI pipeline, you should consider that it can fail because it is an external service.

## Performance

- Use k6 to measure response latency and requests per second.
- Test for each case of the policy (A, B, C) and timeouts.
- Measure operation timings to identify bottlenecks:
    - download
    - parsing
    - filtering
    - usage persistence
- Run against the production build.