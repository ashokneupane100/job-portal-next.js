-- ============================================================
--  CLEAR ALL DATA  —  paste this whole file into Drizzle Studio's
--  SQL console and run it. One click, no checkboxes, no errors.
--
--  How to open the SQL console in Drizzle Studio:
--    1. Open https://local.drizzle.studio
--    2. Click the "SQL" tab at the top
--    3. Paste everything below and press Run
-- ============================================================

-- CASCADE is what makes this work. Without it Postgres refuses with
-- "cannot truncate a table referenced in a foreign key constraint".
-- RESTART IDENTITY makes ids start again from 1.
TRUNCATE TABLE "public"."sessions", "public"."users" RESTART IDENTITY CASCADE;
