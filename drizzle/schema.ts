import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phoneNumber: varchar("phone_number", { length: 18 }).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});


export const sessions=mysqlTable("sessions",{
  id:varchar("id",{length:255}).primaryKey(),
  userId:int('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
  userAgent:text('user_agent').notNull(),
  ip:varchar('ip,{length:255').notNull(),
  expiresAt:timestamp('expires_at').notNull(),
 createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})