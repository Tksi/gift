import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { gamePhaseSchema } from 'schema/game.js';
import type { SessionEnv } from 'routes/sessions/types.js';

/**
 * セッション一覧レスポンススキーマ
 */
export const sessionsListResponseSchema = z.object({
  sessions: z.array(
    z.object({
      sessionId: z.string().openapi({
        description: 'セッションID',
      }),
      playerCount: z.number().int().openapi({
        description: '現在の参加者数',
      }),
      maxPlayers: z.number().int().openapi({
        description: '最大参加者数',
      }),
      phase: gamePhaseSchema.openapi({
        description: 'ゲームフェーズ',
      }),
      createdAt: z.string().openapi({
        description: 'セッション作成日時（ISO8601形式）',
      }),
    }),
  ),
});

/**
 * セッション一覧取得 GET ルートの静的定義。
 */
export const sessionGetRoute = createRoute({
  method: 'get',
  path: '/sessions',
  description: '全セッションの一覧を取得します。',
  responses: {
    200: {
      description: 'セッション一覧が返却されました。',
      content: {
        'application/json': {
          schema: sessionsListResponseSchema,
        },
      },
    },
  },
});

/**
 * セッション一覧取得 GET ルートを持つ Hono アプリケーション。
 */
export const sessionsListGetApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionGetRoute,
  (c) => {
    const deps = c.var.deps;
    const summaries = deps.store.listSessions();

    const sessions = summaries.map((summary) => {
      const envelope = deps.store.getEnvelope(summary.sessionId);
      const snapshot = envelope?.snapshot;

      return {
        sessionId: summary.sessionId,
        playerCount: snapshot?.players.length ?? 0,
        maxPlayers: snapshot?.maxPlayers ?? 7,
        phase: summary.phase,
        createdAt: snapshot?.createdAt ?? summary.updatedAt,
      };
    });

    return c.json({ sessions }, 200);
  },
);
