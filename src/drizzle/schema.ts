import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// 👉 Postgres has no inline ENUM on a column, so the type is declared once
//    and then referenced by name.
export const roleEnum = pgEnum("role", ["admin", "applicant", "employer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  userName: varchar("username", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: roleEnum("role").default("applicant"),
  phoneNumber: varchar("phone_number", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userAgent: text("user_agent").notNull(),
  ip: varchar("ip", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
