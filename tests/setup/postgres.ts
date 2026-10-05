import { PostgreSqlContainer } from "@testcontainers/postgresql";

export function startTestPostgres() {
  return new PostgreSqlContainer("postgres:18-alpine").start();
}
