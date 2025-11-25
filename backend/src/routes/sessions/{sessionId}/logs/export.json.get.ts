import { createRoute, z } from '@hono/zod-openapi';
import {
  type SessionRouteDependencies,
  createSessionDepsMiddleware,
} from 'routes/sessions/types.js';
import { handleLogsJsonExport } from 'routes/sessions/{sessionId}/logs/export.js';
import { errorResponseSchema } from 'schema/sessions.js';
import type { OpenAPIHono } from '@hono/zod-openapi';

/**
 * 依存注入ミドルウェア付きのルート定義を生成する。
 * @param deps セッションルートに必要な依存オブジェクト。
 */
const createExportJsonRoute = (deps: SessionRouteDependencies) =>
  createRoute({
    method: 'get',
    path: '/sessions/{sessionId}/logs/export.json',
    middleware: [createSessionDepsMiddleware(deps)] as const,
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
  const route = createExportJsonRoute(dependencies);

  app.openapi(route, (c) => {
    const deps = c.var.deps;

    return handleLogsJsonExport(c, deps);
  });
};
