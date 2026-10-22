# Job Portal — Next.js + PostgreSQL

A job portal built with [Next.js](https://nextjs.org) (App Router),
[Drizzle ORM](https://orm.drizzle.team) and **PostgreSQL**.

> The tutorial this project follows uses MySQL. This codebase uses PostgreSQL
> instead — see [MySQL → PostgreSQL cheat sheet](#mysql--postgresql-cheat-sheet)
> below for the exact differences so you can follow along without getting stuck.

---

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (or a cloud PostgreSQL URL)

Check that PostgreSQL is up:

```bash
pg_isready -h localhost -p 5432
```

---

## 1. Create the database

Connect as a PostgreSQL superuser and create a role and a database:

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE my_app_user LOGIN PASSWORD 'your_password';
CREATE DATABASE my_app_db OWNER my_app_user;
```

To use the database as `my_app_user`, grant it access to the `public` schema
(PostgreSQL 15+ no longer grants this to `PUBLIC` by default):

```sql
GRANT ALL ON SCHEMA public TO my_app_user;
```

Verify it works:

```bash
psql "postgresql://my_app_user:your_password@localhost:5432/my_app_db" -c "SELECT 1;"
```

## 2. Point the app at the database

```bash
cp .env.example .env
```

Then edit `.env` and set your connection string:

```env
DATABASE_URL="postgresql://my_app_user:your_password@localhost:5432/my_app_db"
```

> Cloud PostgreSQL (Neon, Supabase, Railway) works too — just add
> `?sslmode=require` to the end of the URL.

## 3. Create the tables

```bash
npm install
npm run db:migrate
```

This applies the SQL files in `src/drizzle/migration/` to your database,
creating the `users` and `sessions` tables plus the `role` enum.

You can also push the schema straight from `src/drizzle/schema.ts` without
generating a migration file:

```bash
npm run db:push
```

## 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database commands

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Generate a migration file from `src/drizzle/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:push` | Push the schema directly (no migration file) |
| `npm run db:studio` | Start Drizzle Studio, then open `https://local.drizzle.studio` |
| `npm run db:reset` | Delete **all rows** from `sessions` and `users` |
| `npm run db:clear:sql` | Print (and copy) the `TRUNCATE` statement for Studio |
| `npm run user:set-password -- <email> <password>` | Reset one account's password |

> `db:reset` is destructive. It shows how many rows it is about to delete and
> asks you to type `reset` to confirm. Pass `--yes` to skip the prompt (only
> do this when you really mean it).

> **Drizzle Studio** prints the exact URL to open, e.g.
> `https://local.drizzle.studio`. The local server itself only speaks the
> Studio protocol, so opening `http://127.0.0.1:4983` in a browser will not
> show the UI.

---

## Project structure

```
src/
  app/
    layout.tsx                     Root layout, fonts + <Toaster />
    page.tsx                       Home page — shows the logged-in user
    globals.css                    Tailwind v4 theme + shadcn CSS variables
    login/page.tsx                 Login form (React Hook Form + Zod)
    register/page.tsx              Registration form (React Hook Form + Zod)
  components/ui/                   shadcn/ui components (Radix primitives)
  config/
    db.ts                          PostgreSQL connection + Drizzle instance
    constant.ts                    Session lifetime / cookie constants
  drizzle/
    schema.ts                      Table definitions (source of truth)
    migration/                     Generated SQL migrations
  features/auth/
    auth.schema.ts                 Zod validation schemas
    server/auth.actions.tsx        Server Actions (register / login / logout)
    server/use-cases/sessions.ts   Create / validate / invalidate sessions
    server/use-cases/location.ts   Client IP lookup from request headers
  lib/utils.ts                     cn() helper
scripts/                           Maintenance scripts
```

---

## Sessions (auto-login after registration)

Registering or logging in creates a row in the `sessions` table and puts the
session token in a cookie. The home page reads that cookie back, so you are
signed in immediately after registering.

```
browser ──POST (server action)──▶  registerUserAction
                                       │  1. insert into users
                                       │  2. insert into sessions   ← same transaction
                                       │  3. set cookie "session"
                                       ▼
                              home page reads the cookie
                              → getCurrentUser() → validates the token
```

**How the token is stored**

| Where | What is stored |
| --- | --- |
| Cookie (`session`, httpOnly) | the raw random token |
| `sessions.id` | `sha-256(token)` — the raw token is never in the database |

Because the database only holds the hash, a database dump cannot be replayed
as a login.

**Reading the current user**

```ts
import { getCurrentUser } from "@/features/auth/server/use-cases/sessions";

const user = await getCurrentUser(); // null when nobody is logged in
```

**PostgreSQL note — there is no `insertId`**

The tutorial is written for MySQL, where Drizzle returns the generated id on
the insert result as `insertId`. The Postgres driver has no such property —
you have to ask for the row explicitly:

```ts
// ❌ MySQL only — `insertId` is undefined on Postgres
const [result] = await db.insert(users).values({ ... });
await createSessionAndSetCookies(result.insertId);

// ✅ PostgreSQL — ask for the row back
const [newUser] = await db.insert(users).values({ ... }).returning();
await createSessionAndSetCookies(newUser.id);
```

This is the one difference that silently breaks registration on Postgres: the
session insert gets `user_id = NULL`, the `NOT NULL` constraint rejects it,
and the registration looks like it "did nothing".

---

## MySQL → PostgreSQL cheat sheet

The tutorial uses MySQL. Here is every difference you will run into.

### Connection string

| MySQL | PostgreSQL |
| --- | --- |
| `mysql://user:pass@localhost:3306/db` | `postgresql://user:pass@localhost:5432/db` |
| port `3306` | port `5432` |

### Drizzle setup

```ts
// ❌ MySQL
import mysql from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// ✅ PostgreSQL
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
const client = postgres(process.env.DATABASE_URL);
const db = drizzle({ client });
```

`drizzle.config.ts` — change one line:

```ts
dialect: "postgresql", // was "mysql"
```

### Schema (`src/drizzle/schema.ts`)

| Concept | MySQL | PostgreSQL |
| --- | --- | --- |
| Import from | `drizzle-orm/mysql-core` | `drizzle-orm/pg-core` |
| Auto-increment id | `int("id").autoincrement()` | `serial("id")` |
| Enum | `mysqlEnum("role", [...])` | `pgEnum("role", [...])` (declared once, then referenced) |
| Text column | `text("bio")` | `text("bio")` |
| String column | `varchar("name", { length: 255 })` | `varchar("name", { length: 255 })` |
| Timestamps | `timestamp("created_at")` | `timestamp("created_at", { withTimezone: true, mode: "date" })` |

```ts
// ✅ PostgreSQL
import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "applicant", "employer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  userName: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: roleEnum("role").default("applicant"),
  phoneNumber: varchar("phone_number", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

> **Two PostgreSQL-only notes**
> 1. `pgEnum` cannot be declared inline on a column like `mysqlEnum` can, so
>    the type is created once as `roleEnum` and then referenced by name.
> 2. MySQL's `onUpdateNow()` has no direct PostgreSQL equivalent. `$onUpdate()`
>    is Drizzle's app-level equivalent and refreshes `updated_at` on every
>    `update()` — the database column itself stays `timestamp with time zone`.

### Error codes

| Situation | MySQL | PostgreSQL |
| --- | --- |
| Duplicate key | `ER_DUP_ENTRY` | `23505` (unique violation) |

Drizzle wraps the driver error, so in PostgreSQL the SQLSTATE lives on
`error.cause.code`, not on `error.code`. If you ever need to catch a unique
violation directly, walk the `cause` chain:

```ts
if (err.cause?.code === "23505") {
  // "Key (username)=(x) already exists."  →  err.cause.detail
  // "users_username_key"                  →  err.cause.constraint_name
}
```

> The current `registerUserAction` does not need this: it checks for an
> existing email/username with a `SELECT` before inserting, exactly like the
> tutorial does.

### Deleting all rows

```sql
-- ❌ MySQL
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;

-- ✅ PostgreSQL — CASCADE handles the foreign key for you
TRUNCATE TABLE "public"."sessions", "public"."users" RESTART IDENTITY CASCADE;
```

`RESTART IDENTITY` resets the `serial` sequences so ids start again at 1.

### Other small differences

- **Boolean** — PostgreSQL has a real `boolean` type. MySQL uses `tinyint(1)`.
- **String concatenation** — `||` in PostgreSQL, `CONCAT()` in MySQL.
- **Case-insensitive match** — `ILIKE` in PostgreSQL, `LIKE` in MySQL.
- **JSON** — PostgreSQL has a `jsonb` type, which is indexable.
- **Timestamps** — PostgreSQL's `timestamptz` stores UTC and converts on read.
  MySQL's `DATETIME` has no timezone at all.
- **Limit/offset** — same syntax: `SELECT ... LIMIT 10 OFFSET 5`.

---

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM docs](https://orm.drizzle.team/docs/get-started-postgresql)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
