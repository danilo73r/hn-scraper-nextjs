# Entries API

`GET /api/entries?filter=long-title` or `filter=short-title` returns `{ "entries": [...] }`. Each entry contains `rank`, `title`, `points` and `comments`; word counts stay internal. Responses use `Cache-Control: no-store`.

| Status | Meaning |
| --- | --- |
| 200 | Sorted entries, including an empty list. |
| 400 | Missing, invalid or repeated filter; no usage record is written. |
| 502 | Upstream HTTP, network or parsing failure. |
| 503 | Usage persistence failed; no successful response is returned. |
| 504 | Collection wait expired or the upstream download timed out. |
| 500 | Unexpected error. |

Errors return `{ "error": { "code": "...", "message": "..." } }`; diagnostic details are logged only on the server.

- `REQUEST_TIMEOUT_SECONDS`: defaults to 10; read once per process.
- It limits each caller's wait for collection, including cooldown and retries; shared refresh is not cancelled.
- Database writes are awaited separately, beyond the timeout.
- Valid requests persist timestamp, filter, result count, wait status, outcome and error code before returning.
- Timeouts record failure, never late success.