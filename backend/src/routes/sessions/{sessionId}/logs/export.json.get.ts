import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { handleLogsJsonExport } from 'routes/sessions/{sessionId}/logs/export.js';
import { errorResponseSchema } from 'schema/sessions.js';
import type { SessionEnv } from 'routes/sessions/types.js';

/**
 * JSON ログエクスポート GET ルートのハンドラ。
 * @param c Hono コンテキスト。
 */
export const logsExportJsonGetRoute = createRoute({
  method: 'get',
  path: '/sessions/{sessionId}/logs/export.json',
  description: 'イベントログを JSON 形式でエクスポートします。',
  request: {
    params: z.object({
      sessionId: z.string().min(1).describe('対象となる `session_id`。'),
    }),
  },
  responses: {
    200: {
      description: 'JSON イベントログが返却されました。',
    },
    404: {
      description: 'セッションが見つかりません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

/**
 * JSON ログエクスポート GET ルートを持つ Hono アプリケーション。
 */
export const logsExportJsonGetApp = new OpenAPIHono<SessionEnv>().openapi(
  logsExportJsonGetRoute,
  (c) => {
    const deps = c.var.deps;

    return handleLogsJsonExport(c, deps);
  },
);
