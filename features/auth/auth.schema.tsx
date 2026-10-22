import { z } from "zod";

/**
 * 👉 Zod schemas for the auth feature.
 *
 * A schema is the single source of truth for what a valid name / username /
 * email / password looks like. The same schema is used in the browser (for
 * instant feedback) and on the server (inside the Server Action), so the two
 * can never drift apart.
 *
 * `z.infer` automatically creates a TypeScript type from a Zod schema, so the
 * same shape never has to be written twice.
 */

export const registerUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(255, "Name must not exceed 255 characters"),

  userName: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(255, "Username must not exceed 255 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),

  // Trim + lowercase first and check the format afterwards. Written the other
  // way round (" Foo@Bar.COM ") would be rejected as an invalid email.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, "Email must not exceed 255 characters")
    .pipe(z.email("Please enter a valid email address")),

  // `phone_number` is NOT NULL in the users table, so it belongs to the schema.
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(18, "Phone number must not exceed 18 characters"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
    ),

  role: z
    .enum(["applicant", "employer"], {
      error: "Role must be an applicant or employer",
    })
    .default("applicant"),
});

// z.infer automatically creates a TypeScript type from your Zod schema.
export type RegisterUserData = z.infer<typeof registerUserSchema>;

// Optional: Create a schema with password confirmation - in server we don't need confPass.
export const registerUserWithConfirmSchema = registerUserSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterUserWithConfirmData = z.infer<
  typeof registerUserWithConfirmSchema
>;

export const loginUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, "Email must not exceed 255 characters")
    .pipe(z.email("Please enter a valid email address")),

  // The login form only checks that something was typed. Password rules are a
  // registration concern, and enforcing them here would tell someone that
  // their (wrong) password is "too short" instead of simply "invalid".
  password: z.string().min(1, "Password is required"),
});

export type LoginUserData = z.infer<typeof loginUserSchema>;

/**
 * Turns a ZodError into a `{ fieldName: message }` map so a form can show the
 * error under the exact input that caused it.
 */
export function toFieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const fieldErrors: Partial<Record<string, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}
