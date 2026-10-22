import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { getIPAddress } from "./location";
import { sessions, users } from "@/drizzle/schema";
import { db } from "@/config/db";
import {
  SESSION_COOKIE_NAME,
  SESSION_LIFETIME,
  SESSION_REFRESH_TIME,
} from "@/config/constant";
import { eq } from "drizzle-orm";

type CreateSessionData = {
  userAgent: string;
  ip: string;
  userId: number;
  token: string;
  tx?: DbClient;
};

const generateSessionToken = () => {
  return crypto.randomBytes(32).toString("hex").normalize();
};


const hashSessionToken = (token: string) =>
  crypto.createHash("sha-256").update(token).digest("hex");

const createUserSession = async ({
  token,
  userId,
  userAgent,
  ip,
  tx = db,
}: CreateSessionData) => {
  const hashedToken = hashSessionToken(token);

 
  const [session] = await tx
    .insert(sessions)
    .values({
      id: hashedToken,
      userId,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME * 1000),
      ip,
      userAgent,
    })
    .returning();

  return session;
};

// The `tx` handed to us by `db.transaction(...)`, or the plain `db` instance.
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const createSessionAndSetCookies = async (
  userId: number,
  tx: DbClient = db
) => {
  const token = generateSessionToken();
  const ip = await getIPAddress();
  const headersList = await headers();

  await createUserSession({
    token,
    userId: userId,
    userAgent: headersList.get("user-agent") || "",
    ip: ip,
    tx,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    // `secure: true` would stop the browser from storing the cookie on a
    // plain-http `http://localhost` dev server, so only enable it in production.
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LIFETIME,
  });

  return token;
};

export const validateSessionAndGetUser = async (session: string) => {
  const hashedToken = hashSessionToken(session);

  const [user] = await db
    .select({
      id: users.id,
      session: {
        id: sessions.id,
        expiresAt: sessions.expiresAt,
        userAgent: sessions.userAgent,
        ip: sessions.ip,
      },
      name: users.name,
      userName: users.userName,
      role: users.role,
      phoneNumber: users.phoneNumber,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hashedToken));

  if (!user) return null;

  // 2: the session row is gone or the token does not match any user.
  if (Date.now() >= user.session.expiresAt.getTime()) {
    await invalidateSession(user.session.id);
    return null;
  }

  if (
    Date.now() >=
    user.session.expiresAt.getTime() - SESSION_REFRESH_TIME * 1000
  ) {
    await db
      .update(sessions)
      .set({
        expiresAt: new Date(Date.now() + SESSION_LIFETIME * 1000),
      })
      .where(eq(sessions.id, user.session.id));
  }

  return user;
};


export const invalidateSession = async (id: string) => {
  await db.delete(sessions).where(eq(sessions.id, id));
};


/** Deletes the session row belonging to a raw (un-hashed) cookie token. */
export const invalidateSessionByToken = async (token: string) => {
  await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
};
