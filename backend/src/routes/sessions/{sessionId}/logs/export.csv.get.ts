import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { handleLogsCsvExport } from 'routes/sessions/{sessionId}/logs/export.js';
import { errorResponseSchema } from 'schema/sessions.js';
import type { SessionEnv } from 'routes/sessions/types.js';

/**
 * CSV ログエクスポート GET ルートのハンドラ。
 * @param c Hono コンテキスト。
 */
export const logsExportCsvGetRoute = createRoute({
  method: 'get',
  path: '/sessions/{sessionId}/logs/export.csv',
  description:
    'イベントログを CSV 形式でエクスポートします。`Content-Disposition` を設定してダウンロードを促します。',
  request: {
    params: z.object({
      sessionId: z.string().min(1).describe('対象となる `session_id`。'),
    }),
  },
  responses: {
    200: {
      description: 'CSV が生成されました。',
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
 * CSV ログエクスポート GET ルートを持つ Hono アプリケーション。
 */
export const logsExportCsvGetApp = new OpenAPIHono<SessionEnv>().openapi(
  logsExportCsvGetRoute,
  (c) => {
    const deps = c.var.deps;

    return handleLogsCsvExport(c, deps);
  },
);
