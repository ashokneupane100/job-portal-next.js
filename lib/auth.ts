import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/config/db";
import { sessions, users } from "@/drizzle/schema";

export const SESSION_COOKIE = "session_id";

/** 7 days, matching how long a session stays valid. */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  name: string;
  userName: string;
  email: string | null;
  role: "admin" | "applicant" | "employer";
};

function newSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a session row and sets the session cookie.
 * Must be called from a Server Action or Route Handler.
 */
export async function createSession(
  userId: number,
  meta: { userAgent: string; ip: string },
) {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id,
    userId,
    userAgent: meta.userAgent.slice(0, 1000) || "unknown",
    ip: meta.ip.slice(0, 255) || "unknown",
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return id;
}

/** Reads the cookie and returns the signed-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      userName: users.userName,
      email: users.email,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

/** Deletes the session row and clears the cookie. */
export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  cookieStore.delete(SESSION_COOKIE);
}
