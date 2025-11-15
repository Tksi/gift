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

const turnActionSchema = z.enum(['placeChip', 'takeCard']);

export const sessionActionBodySchema = z.object({
  command_id: z.string().min(1),
  state_version: z.string().min(1),
  player_id: z.string().min(1),
  action: turnActionSchema,
});

export const sessionActionResponseSchema = sessionResponseSchema.extend({
  turn_context: z.object({
    turn: z.number().int().min(0),
    current_player_id: z.string(),
    card_in_center: z.number().int().min(0).nullable(),
    awaiting_action: z.boolean(),
    central_pot: z.number().int().min(0),
    chips: z.record(z.string(), z.number().int().min(0)),
  }),
});
