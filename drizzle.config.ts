import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/drizzle/migration",
  schema: "./src/drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
