"use server";

// 👉 Server Actions in Next.js are special functions that run only on the server, not in the user's browser.
//
// They let you perform things like database queries, API calls, form submissions, or data
// mutations directly from your React components — without creating a separate API route.
//
// You just mark a file (or a function) with "use server", and Next.js automatically runs it on
// the server.
//
// *When you submit a <form> in Next.js using action={yourServerAction}, the framework sends a
// FormData object to that server function. FormData is a built-in Web API type (just like
// Request, Response, or URLSearchParams). It provides methods like .get(), .set(), .append(), and
// .entries().
//
// 👉 Every action validates its input with the Zod schemas from `features/auth/auth.schema.ts`
// before touching the database. The client can never be trusted: a request can be crafted by
// hand, so `safeParse()` inside the action is what actually protects the data.

import { headers } from "next/headers";
import { eq, or } from "drizzle-orm";
import argon2 from "argon2";

import { db } from "@/config/db";
import { users } from "@/drizzle/schema";
import { createSession } from "@/lib/auth";
import {
  LoginUserData,
  loginUserSchema,
  RegisterUserData,
  registerUserSchema,
  toFieldErrors,
} from "../auth.schema";

/** Every action answers with the same shape so the forms can render it generically. */
export type ActionStatus = "SUCCESS" | "ERROR";

export type ActionResult = {
  status: ActionStatus;
  message: string;
  /** Per-field messages, so the form can highlight the input that caused them. */
  fieldErrors?: Partial<Record<string, string>>;
};

/** argon2 hashes start with "$argon2", the old bcrypt hashes start with "$2". */
const LEGACY_BCRYPT_HASH = /^\$2[aby]\$/;

/** Reads the request metadata we store alongside a session. */
async function getRequestMeta() {
  const headerList = await headers();

  return {
    userAgent: headerList.get("user-agent") ?? "unknown",
    ip:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      "unknown",
  };
}

/**
 * Digs the offending column out of a unique-constraint error so the form can
 * point at the right input. Postgres uses SQLSTATE 23505 for unique violations.
 */
function getDuplicateField(error: unknown): "email" | "userName" | null {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current === "object" && current !== null) {
      const err = current as {
        code?: string;
        detail?: string;
        constraint?: string;
        constraint_name?: string;
        message?: string;
        sqlMessage?: string;
      };

      if (err.code === "23505" || err.code === "ER_DUP_ENTRY") {
        const text = [
          err.detail,
          err.constraint,
          err.constraint_name,
          err.message,
          err.sqlMessage,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        // "username" is checked first because "email" is not part of it, but the
        // reverse is not guaranteed for every driver message.
        if (text.includes("username") || text.includes("user_name")) {
          return "userName";
        }
        if (text.includes("email")) return "email";
      }
    }

    current = (current as { cause?: unknown }).cause;
  }

  return null;
}

/**
 * Creates a new account. The password is hashed with argon2 (one-way, salted)
 * before it ever reaches the database, so the original password can never be
 * recovered from a leak.
 */
export const registerUserAction = async (
  data: RegisterUserData,
): Promise<ActionResult> => {
  try {
    // 1. Validate the input. `validatedData` is fully typed and normalized.
    const { data: validatedData, error } = registerUserSchema.safeParse(data);

    if (error) {
      return {
        status: "ERROR",
        message: error.issues[0].message,
        fieldErrors: toFieldErrors(error),
      };
    }

    const { name, userName, email, phoneNumber, password, role } = validatedData;

    // 2. Make sure neither the email nor the username is taken yet.
    const [existingUser] = await db
      .select({
        id: users.id,
        email: users.email,
        userName: users.userName,
      })
      .from(users)
      .where(or(eq(users.email, email), eq(users.userName, userName)))
      .limit(1);

    if (existingUser) {
      if (existingUser.email?.toLowerCase() === email) {
        return {
          status: "ERROR",
          message: "Email Already Exists",
          fieldErrors: { email: "This email is already registered." },
        };
      }

      return {
        status: "ERROR",
        message: "Username Already Exists",
        fieldErrors: { userName: "This username is already taken." },
      };
    }

    // 3. Hash the password. argon2 is salted, so two identical passwords never
    //    produce the same hash.
    const hashPassword = await argon2.hash(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        userName,
        email,
        phoneNumber,
        password: hashPassword,
        role,
      })
      .returning({ id: users.id });

    // 4. Sign the new user in right away so a session row exists immediately.
    await createSession(newUser.id, await getRequestMeta());

    return {
      status: "SUCCESS",
      message: "Registration Completed Successfully",
    };
  } catch (error) {
    // Two requests can pass the duplicate check at the same time, so the
    // database is still the source of truth for uniqueness.
    const duplicateField = getDuplicateField(error);

    if (duplicateField === "email") {
      return {
        status: "ERROR",
        message: "Email Already Exists",
        fieldErrors: { email: "This email is already registered." },
      };
    }

    if (duplicateField === "userName") {
      return {
        status: "ERROR",
        message: "Username Already Exists",
        fieldErrors: { userName: "This username is already taken." },
      };
    }

    console.error("Registration failed:", error);
    return {
      status: "ERROR",
      message: "Unknown Error Occurred! Please Try Again Later",
    };
  }
};

/** Verifies the credentials and creates a session for the signed-in user. */
export const loginUserAction = async (
  data: LoginUserData,
): Promise<ActionResult> => {
  try {
    // 1. Validate the input before it is used in a query.
    const { data: validatedData, error } = loginUserSchema.safeParse(data);

    if (error) {
      return {
        status: "ERROR",
        message: error.issues[0].message,
        fieldErrors: toFieldErrors(error),
      };
    }

    const { email, password } = validatedData;

    const [user] = await db
      .select({
        id: users.id,
        password: users.password,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // One generic message for "no such user" and "wrong password" so the form
    // does not reveal which emails are registered.
    const invalid: ActionResult = {
      status: "ERROR",
      message: "Invalid Email or Password",
    };

    if (!user || user.deletedAt) return invalid;

    // Accounts created before the argon2 switch still hold a bcrypt hash and
    // can never be verified by argon2.
    if (LEGACY_BCRYPT_HASH.test(user.password)) {
      console.warn(
        `User ${user.id} still has a legacy bcrypt hash. Reset the password to let them sign in.`,
      );
      return invalid;
    }

    // 2. Check the password against the stored hash.
    const isValidPassword = await argon2.verify(user.password, password);
    if (!isValidPassword) return invalid;

    // 3. Create the session.
    await createSession(user.id, await getRequestMeta());

    return {
      status: "SUCCESS",
      message: "Login Successful",
    };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      status: "ERROR",
      message: "Unknown Error Occurred! Please Try Again Later",
    };
  }
};
