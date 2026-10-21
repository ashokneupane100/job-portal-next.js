"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/config/db";
import { users } from "@/drizzle/schema";
import { createSession } from "@/lib/auth";

interface LoginData {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

export const loginAction = async (data: LoginData): Promise<LoginResult> => {
  const email = data.email.toLowerCase().trim();
  const { password } = data;

  if (!email || !password) {
    return { success: false, message: "Email and password are required." };
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

    // Use one generic message for "no such user" and "wrong password" so the
    // form does not reveal which emails are registered.
    const invalid: LoginResult = {
      success: false,
      message: "Invalid email or password.",
    };

    if (!user || user.deletedAt) return invalid;

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return invalid;

    const headerList = await headers();
    await createSession(user.id, {
      userAgent: headerList.get("user-agent") ?? "unknown",
      ip:
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerList.get("x-real-ip") ??
        "unknown",
    });

    return { success: true };
  } catch (err) {
    console.error("Login failed:", err);
    return { success: false, message: "Login failed. Please try again." };
  }
};
