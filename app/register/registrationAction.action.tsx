"use server";

import bcrypt from "bcryptjs";
import { db } from "@/config/db";
import { users } from "@/drizzle/schema";

interface RegistrationData {
  name: string;
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: "applicant" | "employer";
}

export interface RegistrationResult {
  success: boolean;
  field?: "userName" | "email";
  message?: string;
}

const getDuplicateField = (err: unknown): "userName" | "email" | null => {
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i++) {
    if (typeof current === "object" && current !== null) {
      const e = current as {
        code?: string;
        detail?: string;
        constraint?: string;
        constraint_name?: string;
        message?: string;
        sqlMessage?: string;
      };

      // Postgres unique violation code is 23505
      if (e.code === "23505") {
        const textToInspect = `${e.detail ?? ""} ${e.constraint ?? ""} ${e.constraint_name ?? ""} ${e.message ?? ""}`.toLowerCase();
        if (textToInspect.includes("username") || textToInspect.includes("user_name")) {
          return "userName";
        }
        if (textToInspect.includes("email")) {
          return "email";
        }
      }

      // MySQL duplicate key code
      if (e.code === "ER_DUP_ENTRY") {
        const msg = `${e.sqlMessage ?? ""} ${e.message ?? ""}`.toLowerCase();
        if (msg.includes("username") || msg.includes("user_name")) {
          return "userName";
        }
        if (msg.includes("email")) {
          return "email";
        }
      }
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
};

export const registrationAction = async (
  data: RegistrationData
): Promise<RegistrationResult> => {
  const { name, userName, email, phoneNumber, password, role } = data;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      name,
      userName,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
    });
    return { success: true };
  } catch (err) {
    const duplicateField = getDuplicateField(err);

    if (duplicateField === "userName") {
      return {
        success: false,
        field: "userName",
        message: "This username already exists. Try another one.",
      };
    }

    if (duplicateField === "email") {
      return {
        success: false,
        field: "email",
        message: "This email already exists. Try another one.",
      };
    }

    console.error("Registration failed:", err);
    return {
      success: false,
      message: "Registration failed. Please try again.",
    };
  }
};

