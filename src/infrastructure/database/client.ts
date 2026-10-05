import { Pool } from "pg";

export function createDatabasePool(
  connectionString = process.env.DATABASE_URL,
): Pool {
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });

  // Idle connections can fail independently of a query; handle their errors.
  pool.on("error", (error: Error) => {
    console.error("PostgreSQL idle connection error:", error.message);
  });
  return pool;
}
