"use server";

import { db } from "@/config/db";
import { users } from "@/drizzle/schema";
import argon2 from "argon2";
import { eq, or } from "drizzle-orm";
import {
  LoginUserData,
  loginUserSchema,
  RegisterUserData,
  registerUserSchema,
} from "../auth.schema";
import { createSessionAndSetCookies, invalidateSessionByToken } from "./use-cases/sessions";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/config/constant";

export const registerUserAction = async (data: RegisterUserData) => {
  try {
    const { data: validatedData, error } = registerUserSchema.safeParse(data);
    if (error) return { status: "ERROR", message: error.issues[0].message };

    const { name, userName, email, password, role } = validatedData;

    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.userName, userName)));

    if (user) {
      if (user.email === email)
        return { status: "ERROR", message: "Email Already Exists" };
      else
        return {
          status: "ERROR",
          message: "UseName Already Exists",
        };
    }

    const hashPassword = await argon2.hash(password);

    /**
     * The user row and the session row are written in a single transaction:
     * a registration either creates BOTH or neither. If the session insert
     * fails we do not want an orphaned user with no way to log in.
     */
    await db.transaction(async (tx) => {
      /**
       * PostgreSQL has no `insertId`. To read the generated `serial` id back
       * you ask for it explicitly with `.returning()`.
       */
      const [newUser] = await tx
        .insert(users)
        .values({ name, userName, email, password: hashPassword, role })
        .returning();

      /**
       * Auto-login after registration: create the `sessions` row and put the
       * session token in the cookie.
       */
      await createSessionAndSetCookies(newUser.id, tx);
    });

    return {
      status: "SUCCESS",
      message: "Registration Completed Successfully",
    };
  } catch (error) {
    console.error("[registerUserAction] failed:", error);
    return {
      status: "ERROR",
      message: "Unknown Error Occurred! Please Try Again Later",
    };
  }
};

export const loginUserAction = async (data: LoginUserData) => {
  try {
    const { data: validatedData, error } = loginUserSchema.safeParse(data);
    if (error) return { status: "ERROR", message: error.issues[0].message };

    const { email, password } = validatedData;

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      return { status: "ERROR", message: "Invalid Email or Password" };
    }

    const isValidPassword = await argon2.verify(user.password, password);

    if (!isValidPassword)
      return { status: "ERROR", message: "Invalid Email or Password" };

    // Log the user in: create the `sessions` row and set the session cookie.
    await createSessionAndSetCookies(user.id);

    return {
      status: "SUCCESS",
      message: "Login Successful",
    };
  } catch (error) {
    console.error("[loginUserAction] failed:", error);
    return {
      status: "ERROR",
      message: "Unknown Error Occurred! Please Try Again Later",
    };
  }
};

/**
 * Deletes the session row and clears the cookie, so the user is logged out
 * on every device that used this session.
 */
export const logoutUserAction = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await invalidateSessionByToken(sessionToken);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
};
