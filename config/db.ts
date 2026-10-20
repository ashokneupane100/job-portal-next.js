import mysql from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL as string,
});

export const db = drizzle({ client: pool });
