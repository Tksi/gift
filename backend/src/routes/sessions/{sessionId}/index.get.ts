import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { respondNotFound, toSessionResponse } from 'routes/sessions/shared.js';
import { errorResponseSchema, sessionResponseSchema } from 'schema/sessions.js';
import type { SessionEnv } from 'routes/sessions/types.js';

/**
 * セッション取得 GET ルートの静的定義。
 */
export const sessionGetRoute = createRoute({
  method: 'get',
  path: '/sessions/{sessionId}',
  description:
    '既存セッションの最新スナップショットと状態バージョンを返し、クライアントが状態同期を行えるようにします。',
  request: {
    params: z.object({
      sessionId: z
        .string()
        .min(1)
        .describe(
          '取得対象の `session_id`。作成時にレスポンスへ含まれる値を指定します。',
        ),
    }),
  },
  responses: {
    200: {
      description: '該当セッションが見つかり、現在の状態が返却されました。',
      content: {
        'application/json': {
          schema: sessionResponseSchema,
        },
      },
    },
    404: {
      description: '指定された `session_id` のデータが存在しません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

/**
 * セッション取得 GET ルートを持つ Hono アプリケーション。
 */
export const sessionGetApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionGetRoute,
  (c) => {
    const deps = c.var.deps;
    const { sessionId } = c.req.valid('param');
    const envelope = deps.store.getEnvelope(sessionId);

    if (envelope) {
      return c.json(toSessionResponse(envelope), 200);
    }

    return respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');
  },
);
