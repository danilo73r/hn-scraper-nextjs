# Stackbuilders -  Hacker News Crawler

A Next.js/Typescript app that scrapes the first 30 entries from Hacker News, filters them by title word count, and store usage data in PostgreSQL.


## Architecture

- The application follows [Jimmy Bogard's Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/) approach, grouping related code by use case.
    - `src/features/hacker-news` groups use cases
    - `get-entries` contains the logic for retrieving entries
    - `src/app` handles Next.js routing.
    - `src/infrastructure` contains shared infrastructure, such as the PostgreSQL client.
- The design stays simple and evolves as needs grow, keeping coupling between slices low and favoring CQRS when useful.


## Filtering

- Long titles (>5 words): comments descending.
- Short titles (≤5 words): points descending.
- Ties: titles A–Z, ignoring case. Complete ties keep the original order.


## Testing

### Unit tests

- Word counting: whitespace, symbols, numbers, and hyphenated words.
- Filtering: precomputed word counts, the five-word limit, and empty lists.
- Sorting: descending metrics, titles A–Z ignoring case, and stable ties.

```bash
npm run test:unit
```

## Performance

### Parsing benchmark

- Points and Comments share similar text patten in the fixtures. 
- This benchmark compares parse algorithms, the best is choice of `split`.
- Cheerio decodes `&nbsp;` as \u00A0; the parser handles both separators.

```bash
node scripts/parser/benchmark-parsing.mjs
node scripts/parser/named-character-references.mjs
```
