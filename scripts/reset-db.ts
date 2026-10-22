import "dotenv/config";
import postgres from "postgres";
import { createInterface } from "node:readline/promises";

/**
 * Asks the user to type the word "reset" before anything is deleted.
 *
 * TRUNCATE cannot be undone and there is no `WHERE` clause to lean on, so a
 * mis-typed DATABASE_URL would wipe the wrong database. Skipping the prompt is
 * only allowed with `--yes` (or when ALLOW_REMOTE_RESET=true is set).
 */
async function confirmReset(database: string): Promise<boolean> {
  const args = process.argv.slice(2);
  const skipPrompt = args.includes("--yes") || args.includes("-y");

  if (skipPrompt) return true;

  if (!process.stdin.isTTY) {
    console.error(
      "✗ Refusing to reset without a confirmation prompt.\n" +
        "  stdin is not a TTY, so there is nobody to ask. Re-run with --yes\n" +
        "  if you really mean it.",
    );
    return false;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question(
        `This will DELETE ALL ROWS from "${database}" (sessions, users).\n` +
          `Type "reset" to continue: `,
      )
    ).trim();

    if (answer !== "reset") {
      console.log("✗ Aborted. Nothing was deleted.");
      return false;
    }

    return true;
  } finally {
    rl.close();
  }
}

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
    // Resolve the schema from the connection's search_path instead of
    // hardcoding "public", so this also works on cloud databases where the
    // tables live in a dedicated schema.
    const [schemaRow] = await sql`SELECT current_schema()::text AS name`;
    const schema = schemaRow.name as string;

    const rows = await sql`
      SELECT relname AS table
      FROM pg_class
      WHERE relname IN ${sql(TABLES)}
        AND relkind = 'r'
        AND relnamespace = ${schema}::regnamespace
    `;
    const existing = rows.map((r) => r.table as string);
    const missing = TABLES.filter((t) => !existing.includes(t));

    if (missing.length > 0) {
      console.error(
        `✗ Table(s) not found in schema "${schema}": ${missing.join(", ")}.\n` +
          "  Run `npm run db:migrate` first to create them.",
      );
      await sql.end();
      process.exit(1);
    }

    // Show what is about to be lost, then make the user confirm.
    console.log(`\nAbout to delete (schema "${schema}"):`);
    for (const table of TABLES) {
      const [row] = await sql.unsafe(
        `SELECT count(*)::int AS c FROM "${schema}"."${table}"`,
      );
      console.log(`  ${table}: ${row.c} row(s)`);
    }

    const [dbRow] = await sql`SELECT current_database()::text AS name`;
    const database = dbRow.name as string;

    if (!(await confirmReset(database))) {
      await sql.end();
      process.exit(1);
    }

    await sql.begin(async (tx) => {
      await tx.unsafe(
        `TRUNCATE TABLE ${TABLES.map((t) => `"${schema}"."${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
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
