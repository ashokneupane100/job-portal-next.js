import "dotenv/config";
import postgres from "postgres";
import argon2 from "argon2";

// Sets (or resets) the password of an existing account.
//
// Useful after the switch from bcrypt to argon2: accounts created with the old
// hash format can never be verified by argon2, so their password has to be
// re-hashed once.
//
// Usage: npm run user:set-password -- <email-or-username> <new-password>

async function main() {
  const [identifier, password] = process.argv.slice(2);

  if (!identifier || !password) {
    console.error(
      "✗ Usage: npm run user:set-password -- <email-or-username> <new-password>",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("✗ Password must be at least 8 characters long.");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "✗ DATABASE_URL is not set. Add it to your .env file before running this script.",
    );
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    const rows = await sql`
      SELECT id, email, username
      FROM users
      WHERE lower(email) = lower(${identifier}) OR lower(username) = lower(${identifier})
    `;

    const user = rows[0];
    if (!user) {
      console.error(`✗ No user found for "${identifier}".`);
      await sql.end();
      process.exit(1);
    }

    const hashedPassword = await argon2.hash(password);

    await sql`
      UPDATE users
      SET password = ${hashedPassword}, updated_at = now()
      WHERE id = ${user.id}
    `;

    console.log(`✓ Password updated for ${user.username} (${user.email}).`);
    console.log("  The new password is hashed with argon2.");
  } catch (error) {
    console.error(
      "✗ Failed to update the password:",
      error instanceof Error ? error.message : error,
    );
    await sql.end();
    process.exit(1);
  }

  await sql.end();
}

main();
