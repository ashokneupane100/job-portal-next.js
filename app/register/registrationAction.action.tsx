"use server";

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

const getDuplicateKey = (err: unknown): string | null => {
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i++) {
    if (typeof current === "object" && "code" in current) {
      if ((current as { code?: string }).code === "ER_DUP_ENTRY") {
        const message =
          (current as { sqlMessage?: string }).sqlMessage ??
          (current as { message?: string }).message ??
          "";
        const match = message.match(/for key '([^']+)'/);
        return match ? match[1] : null;
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
    await db
      .insert(users)
      .values({ name, userName, email, phoneNumber, password, role });
    return { success: true };
  } catch (err) {
    const duplicateKey = getDuplicateKey(err);

    if (duplicateKey?.includes("user_name")) {
      return {
        success: false,
        field: "userName",
        message: "This username already exists. Try another one.",
      };
    }

    if (duplicateKey?.includes("email")) {
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
