"use server";

import { headers } from "next/headers";
import { eq, or } from "drizzle-orm";
import argon2 from "argon2";

import { db } from "@/config/db";
import { users } from "@/drizzle/schema";
import { createSession } from "@/lib/auth";

/** Every action answers with the same shape so the forms can render it generically. */
export type ActionStatus = "SUCCESS" | "ERROR";

/** Set when the problem belongs to one specific input, so the form can highlight it. */
export type ActionField =
  | "name"
  | "userName"
  | "email"
  | "phoneNumber"
  | "password"
  | "role";

export type ActionResult = {
  status: ActionStatus;
  message: string;
  field?: ActionField;
};

export type RegisterInput = {
  name: string;
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: "applicant" | "employer";
};

export type LoginInput = {
  email: string;
  password: string;
};

type NormalizedRegisterInput = {
  name: string;
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: "applicant" | "employer";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

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
function getDuplicateField(error: unknown): ActionField | null {
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

function normalizeRegisterInput(input: RegisterInput): NormalizedRegisterInput {
  return {
    name: (input?.name ?? "").trim(),
    userName: (input?.userName ?? "").trim(),
    email: (input?.email ?? "").trim().toLowerCase(),
    phoneNumber: (input?.phoneNumber ?? "").trim(),
    password: input?.password ?? "",
    role: input?.role,
  };
}

function validateRegisterInput(
  data: NormalizedRegisterInput,
): ActionResult | null {
  if (!data.name) {
    return { status: "ERROR", message: "Full name is required.", field: "name" };
  }
  if (data.name.length > 255) {
    return {
      status: "ERROR",
      message: "Full name must be 255 characters or fewer.",
      field: "name",
    };
  }
  if (!data.userName) {
    return {
      status: "ERROR",
      message: "Username is required.",
      field: "userName",
    };
  }
  if (data.userName.length < 3) {
    return {
      status: "ERROR",
      message: "Username must be at least 3 characters long.",
      field: "userName",
    };
  }
  if (!data.email) {
    return { status: "ERROR", message: "Email address is required.", field: "email" };
  }
  if (!EMAIL_PATTERN.test(data.email)) {
    return {
      status: "ERROR",
      message: "Enter a valid email address.",
      field: "email",
    };
  }
  if (!data.phoneNumber) {
    return {
      status: "ERROR",
      message: "Phone number is required.",
      field: "phoneNumber",
    };
  }
  if (data.phoneNumber.length > 18) {
    return {
      status: "ERROR",
      message: "Phone number must be 18 characters or fewer.",
      field: "phoneNumber",
    };
  }
  if (!data.password) {
    return { status: "ERROR", message: "Password is required.", field: "password" };
  }
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "ERROR",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      field: "password",
    };
  }
  if (data.role !== "applicant" && data.role !== "employer") {
    return { status: "ERROR", message: "Select a valid role.", field: "role" };
  }

  return null;
}

/**
 * Creates a new account. The password is hashed with argon2 (one-way, salted)
 * before it ever reaches the database, so the original password can never be
 * recovered from a leak.
 */
export const registerUserAction = async (
  input: RegisterInput,
): Promise<ActionResult> => {
  const data = normalizeRegisterInput(input);

  const validationError = validateRegisterInput(data);
  if (validationError) return validationError;

  try {
    const existing = await db
      .select({
        id: users.id,
        email: users.email,
        userName: users.userName,
      })
      .from(users)
      .where(or(eq(users.email, data.email), eq(users.userName, data.userName)))
      .limit(1);

    const clash = existing[0];
    if (clash) {
      if (clash.email?.toLowerCase() === data.email) {
        return {
          status: "ERROR",
          message: "This email is already registered.",
          field: "email",
        };
      }
      return {
        status: "ERROR",
        message: "This username is already taken.",
        field: "userName",
      };
    }

    const hashedPassword = await argon2.hash(data.password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: data.name,
        userName: data.userName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        role: data.role,
      })
      .returning({ id: users.id });

    // Sign the new user in right away so a session row exists immediately.
    await createSession(newUser.id, await getRequestMeta());

    return {
      status: "SUCCESS",
      message: "Registration completed successfully.",
    };
  } catch (error) {
    // Two requests can pass the duplicate check at the same time, so the
    // database is still the source of truth for uniqueness.
    const duplicateField = getDuplicateField(error);
    if (duplicateField === "email") {
      return {
        status: "ERROR",
        message: "This email is already registered.",
        field: "email",
      };
    }
    if (duplicateField === "userName") {
      return {
        status: "ERROR",
        message: "This username is already taken.",
        field: "userName",
      };
    }

    console.error("Registration failed:", error);
    return {
      status: "ERROR",
      message: "Registration failed. Please try again.",
    };
  }
};

/** Verifies the credentials and creates a session for the signed-in user. */
export const loginUserAction = async (
  input: LoginInput,
): Promise<ActionResult> => {
  const email = (input?.email ?? "").trim().toLowerCase();
  const password = input?.password ?? "";

  if (!email || !password) {
    return { status: "ERROR", message: "Email and password are required." };
  }

  try {
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
      message: "Invalid email or password.",
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

    const isValidPassword = await argon2.verify(user.password, password);
    if (!isValidPassword) return invalid;

    await createSession(user.id, await getRequestMeta());

    return { status: "SUCCESS", message: "Login successful." };
  } catch (error) {
    console.error("Login failed:", error);
    return { status: "ERROR", message: "Login failed. Please try again." };
  }
};
