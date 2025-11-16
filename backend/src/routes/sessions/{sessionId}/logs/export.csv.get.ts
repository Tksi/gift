import { createRoute, z } from '@hono/zod-openapi';
import { errorResponseSchema } from 'schema/sessions.js';
import { handleLogsCsvExport } from 'routes/sessions/{sessionId}/logs/export.js';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';

const exportCsvRoute = createRoute({
  method: 'get',
  path: '/sessions/{sessionId}/logs/export.csv',
  description:
    'イベントログを CSV 形式でエクスポートします。`Content-Disposition` を設定してダウンロードを促します。',
  request: {
    params: z.object({
      sessionId: z
        .string()
        .min(1)
        .describe('対象となる `session_id`。'),
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

export const registerLogsExportCsvRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  app.openapi(exportCsvRoute, (c) => handleLogsCsvExport(c, dependencies));
};
