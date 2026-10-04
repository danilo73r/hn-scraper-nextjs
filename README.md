# Stackbuilders -  Hacker News Crawler

A Next.js/Typescript app that scrapes the first 30 entries from Hacker News, filters them by title word count, and store usage data in PostgreSQL.

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
