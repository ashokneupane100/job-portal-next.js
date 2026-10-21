import "dotenv/config";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "✗ DATABASE_URL is not set. Add it to your .env file before running db:reset.",
    );
    process.exit(1);
  }

  // Safety guard: never wipe a non-local database unless explicitly allowed.
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
  if (!isLocal && process.env.ALLOW_REMOTE_RESET !== "true") {
    console.error(
      "✗ Refusing to reset a non-local database.\n" +
        "  This looks like a remote host. Set ALLOW_REMOTE_RESET=true to override.",
    );
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });

  // Order matters for clarity, but ON DELETE CASCADE already handles sessions.
  // RESTART IDENTITY resets the `id` serial back to 1, giving you a clean slate.
  const TABLES = ["sessions", "users"] as const;

  try {
    const rows = await sql`
      SELECT relname AS table
      FROM pg_class
      WHERE relname IN ${sql(TABLES)}
        AND relkind = 'r'
    `;
    const existing = rows.map((r) => r.table as string);
    const missing = TABLES.filter((t) => !existing.includes(t));

    if (missing.length > 0) {
      console.error(
        `✗ Table(s) not found: ${missing.join(", ")}.\n` +
          "  Run `npm run db:migrate` first to create them.",
      );
      await sql.end();
      process.exit(1);
    }

    await sql.begin(async (tx) => {
      await tx.unsafe(
        `TRUNCATE TABLE ${TABLES.map((t) => `"public"."${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
      );
    });

    console.log(`✓ Reset complete. Emptied: ${TABLES.join(", ")}`);
    console.log("  Auto-increment ids restarted at 1.");
  } catch (error) {
    console.error(
      "✗ Reset failed:",
      error instanceof Error ? error.message : error,
    );
    await sql.end();
    process.exit(1);
  }

  await sql.end();
}

main();
