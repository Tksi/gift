import { createRoute, z } from '@hono/zod-openapi';
import { respondNotFound, toSessionResponse } from 'routes/sessions/shared.js';
import { errorResponseSchema, sessionResponseSchema } from 'schema/sessions.js';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';

const getSessionRoute = createRoute({
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
 * セッション取得 GET ルートをアプリケーションへ登録する。
 * @param app OpenAPIHono インスタンス。
 * @param dependencies ストアなどの依存オブジェクト。
 */
export const registerSessionGetRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  app.openapi(getSessionRoute, (c) => {
    const { sessionId } = c.req.valid('param');
    const envelope = dependencies.store.getEnvelope(sessionId);

    if (envelope) {
      return c.json(toSessionResponse(envelope), 200);
    }

    return respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');
  });
};
