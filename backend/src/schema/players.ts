import { z } from '@hono/zod-openapi';

export const playerRegistrationSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Player id must include alphanumeric characters, underscore, or hyphen.',
    }),
  display_name: z.string().min(1).max(64),
});

export const playerSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

export type PlayerRegistration = z.infer<typeof playerRegistrationSchema>;
