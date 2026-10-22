import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
      "  Copy .env.example to .env and point it at your PostgreSQL database, e.g.\n" +
      "  DATABASE_URL=postgresql://postgres:password123@localhost:5432/next_job_portal",
  );
}

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client = globalForDb.conn ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = client;
}

export const db = drizzle({ client });
