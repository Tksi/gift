import { z } from '@hono/zod-openapi';
import { playerSummarySchema } from './players.js';

export const gamePhaseSchema = z.enum(['setup', 'running', 'completed']);

export const snapshotSchema = z.object({
  sessionId: z.string(),
  phase: gamePhaseSchema,
  deck: z.array(z.number()),
  discardHidden: z.array(z.number()),
  playerOrder: z.array(z.string()),
  rngSeed: z.string(),
  players: z.array(playerSummarySchema),
  chips: z.record(z.string(), z.number()),
  hands: z.record(z.string(), z.array(z.number())),
  centralPot: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
