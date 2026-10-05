import type { Pool } from "pg";
import type { UsageEvent } from "./usage-event";

export class UsageRepository {
  constructor(private readonly database: Pick<Pool, "query">) {}

  async save(event: UsageEvent): Promise<void> {
    await this.database.query(
      `INSERT INTO usage_events
        (requested_at, filter, result_count, delayed, outcome, error_code)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        event.requestedAt,
        event.filter,
        event.resultCount,
        event.delayed,
        event.outcome,
        event.errorCode,
      ],
    );
  }
}
