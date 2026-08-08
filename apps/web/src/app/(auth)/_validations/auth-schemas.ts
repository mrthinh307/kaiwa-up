import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter your email address." })
  .pipe(z.email({ error: "Enter a valid email address." }));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Enter your password." }),
});

export const registerSchema = z
  .object({
    confirmPassword: z.string().min(1, { error: "Confirm your password." }),
    displayName: z.string().trim().min(1, { error: "Enter a display name." }),
    email: emailSchema,
    password: z
      .string()
      .min(1, { error: "Create a password." })
      .min(8, { error: "Use at least 8 characters." }),
  })
  .refine(({ confirmPassword, password }) => password === confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
