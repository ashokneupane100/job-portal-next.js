import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL!;

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client = globalForDb.conn ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = client;
}

export const db = drizzle({ client });



