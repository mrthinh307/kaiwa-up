import { z } from "zod";

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { error: "Enter a display name." })
    .max(50, { error: "Use 50 characters or fewer." }),
});

export type ProfileValues = z.infer<typeof profileSchema>;
