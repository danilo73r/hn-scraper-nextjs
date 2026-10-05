import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";

export function startTestPostgres() {
  return new PostgreSqlContainer("postgres:18-alpine").start();
}

export function migrateTestPostgres(
  databaseUrl: string,
  direction: "up" | "down" = "up",
) {
  return runner({
    databaseUrl,
    dir: fileURLToPath(
      new URL("../../src/infrastructure/database/migrations", import.meta.url),
    ),
    direction,
    migrationsTable: "pgmigrations",
    singleTransaction: true,
    log: () => {},
  });
}
