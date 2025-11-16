import { createRoute, z } from '@hono/zod-openapi';
import { handleLogsJsonExport } from 'routes/sessions/{sessionId}/logs/export.js';
import { errorResponseSchema } from 'schema/sessions.js';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';

const exportJsonRoute = createRoute({
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
 * ログの JSON エクスポート GET ルートを登録する。
 * @param app ルート登録先の Hono インスタンス。
 * @param dependencies セッションストアなどの依存性。
 */
export const registerLogsExportJsonRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  app.openapi(exportJsonRoute, (c) => handleLogsJsonExport(c, dependencies));
};
