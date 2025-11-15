import { z } from '@hono/zod-openapi';
import { snapshotSchema } from './game.js';
import { playerRegistrationSchema } from './players.js';

export const createSessionBodySchema = z.object({
  players: z.array(playerRegistrationSchema).min(1),
  seed: z.string().min(1).optional(),
});

export const sessionResponseSchema = z.object({
  session_id: z.string(),
  state_version: z.string(),
  state: snapshotSchema,
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
