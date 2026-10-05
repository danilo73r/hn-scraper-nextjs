# Stackbuilders -  Hacker News Crawler

A Next.js/Typescript app that scrapes the first 30 entries from Hacker News, filters them by title word count, and store usage data in PostgreSQL.


## Instructions - Docker deployment

Run these steps from `nextjs/`, with Docker running.
Node.js is not required on the host.

### Start

PostgreSQL starts first, migrations run automatically, then the app starts.

1. Copy `.env.example` to `.env` (once).
2. Build and start:

   ```bash
   docker compose up -d --build
   ```

3. Open http://localhost:3000. If the port is busy, change `APP_PORT` in `.env` and use that port.


### Database

- Init/update only: `docker compose run --rm --build migrations`.
- Reset (**deletes the deployment's database**):
    ```bash
    docker compose down -v
    docker compose up -d --build
    ```
- Development and test databases are separate and unaffected by this reset.

### Build and stop

- Build only: `docker compose build`.
- Stop: `docker compose down` (preserves data).


## Architecture

- The application follows [Jimmy Bogard's Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/) approach, grouping related code by use case.
    - `src/features/hacker-news` groups use cases
    - `get-entries` contains the logic for retrieving entries
    - `src/app` handles Next.js routing.
    - `src/infrastructure` contains shared infrastructure, such as the PostgreSQL client.
- The design stays simple and evolves as needs grow, keeping coupling between slices low and favoring CQRS when useful.


## Filtering

API: `GET /api/entries?filter=all|long-title|short-title`. Usage is saved before responding; see [API details](docs/api.md).

- All (default in the UI): original order.
- Long titles (>5 words): comments descending.
- Short titles (≤5 words): points descending.
- Ties: titles A–Z, ignoring case. Complete ties keep the original order.


## Testing

### Unit tests

- Word counting: whitespace, symbols, numbers, and hyphenated words.
- Filtering: precomputed word counts, the five-word limit, and empty lists.
- Sorting: descending metrics, titles A–Z ignoring case, and stable ties.
- HTML parsing using saved fixtures: field extraction, missing metrics, comment link positions, and invalid HTML or values.
- Page fetching: fixed URL, blocked redirects, HTTP/network errors, and timeouts while waiting for headers or the body. Tested with mocked responses and fake timers.
- Fetch retries: three total attempts, retry delays, mixed failures, and HTTP 429 `Retry-After`. Tested with mocked responses and fake timers.
- Collector worker: shared concurrent requests, cooldowns, recovery, and no periodic scraping.

```bash
npm run test:unit
```

### Live & frontend test

`npm run test:live` checks the first 30 Hacker News entries. Requires network access; excluded from CI.

`npm run test:frontend` checks selection, keyboard access, API states and late responses with mocked fetch.


## Performance

### Parsing benchmark

- Points and Comments share similar text patten in the fixtures. 
- This benchmark compares parse algorithms, the best is choice of `split`.
- Cheerio decodes `&nbsp;` as \u00A0; the parser handles both separators.

```bash
node scripts/parser/benchmark-parsing.mjs
node scripts/parser/named-character-references.mjs
```

## Collector worker

`SnapshotCache` stores immutable entries and collection time, reusing word counts for current titles. Failed updates preserve the snapshot; filtering happens on query.

`CachedEntries` returns fresh cache, refreshes stale cache in background, and waits for missing or expired cache. Ages come from `.env.local`.

`CollectorWorker` is a class in the API process, not a separate Node.js thread; downloads and waits are asynchronous.

The worker shares one active promise across callers, so only one collection runs at a time within the Node.js process. Cooldown is the mandatory pause between collection operations: 60 seconds after success, or the error's retry delay after failure (up to 1 hour for HTTP 429). Cooldown and retry intervals are fixed independently of cache settings. `nextAllowedAt` stores when the next collection may start.

1. A caller requests a collection.
2. If an operation already exists, the caller shares its promise (`activeCollection`).
3. If the cooldown has not ended, the operation waits without blocking the thread (`waiting`).
4. The worker runs collection and its retries (`collecting`).
5. When it finishes, it clears the active promise and enters `cooldown`, the pause before another collection is allowed.
6. A failure is stored in `lastError`; a successful collection clears it.
7. Once the cooldown ends, the worker is `idle`, ready for another request. It does not start a collection automatically.

## PostgreSQL

Local development and tests use PostgreSQL 18. With Docker running, copy `.env.example` to `.env.local`, then run `npm run db:up` and `npm run db:migrate`. Only usage records are persisted; scraped entries stay in memory.

`npm run db:migration:create -- name` creates a SQL template. Edit it, then apply pending migrations with `npm run db:migrate`.

`npm run test:integration` uses disposable PostgreSQL containers and runs in CI. `npm run db:down` stops the local database and preserves its volume.

`UsageRepository.save(event)` waits for persistence and propagates database errors. Callers must await it before returning a successful response.

## UI

The UI loads `all` on startup and requests the selected filter from the API, with loading, empty, error and retry states. Previous requests are cancelled when changing filters.
