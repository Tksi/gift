import { createRoute, z } from '@hono/zod-openapi';
import {
  type SessionRouteDependencies,
  createSessionDepsMiddleware,
} from 'routes/sessions/types.js';
import { handleLogsCsvExport } from 'routes/sessions/{sessionId}/logs/export.js';
import { errorResponseSchema } from 'schema/sessions.js';
import type { OpenAPIHono } from '@hono/zod-openapi';

/**
 * 依存注入ミドルウェア付きのルート定義を生成する。
 * @param deps セッションルートに必要な依存オブジェクト。
 */
const createExportCsvRoute = (deps: SessionRouteDependencies) =>
  createRoute({
    method: 'get',
    path: '/sessions/{sessionId}/logs/export.csv',
    middleware: [createSessionDepsMiddleware(deps)] as const,
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
 * ログの CSV エクスポート GET ルートを登録する。
 * @param app ルートを登録する Hono インスタンス。
 * @param dependencies セッションストアなどの依存性。
 */
export const registerLogsExportCsvRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  const route = createExportCsvRoute(dependencies);

  app.openapi(route, (c) => {
    const deps = c.var.deps;

    return handleLogsCsvExport(c, deps);
  });
};
