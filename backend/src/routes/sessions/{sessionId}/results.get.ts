import { createRoute, z } from '@hono/zod-openapi';
import { respondNotFound } from 'routes/sessions/shared.js';
import {
  type SessionRouteDependencies,
  createSessionDepsMiddleware,
} from 'routes/sessions/types.js';
import {
  errorResponseSchema,
  sessionResultsResponseSchema,
} from 'schema/sessions.js';
import { createErrorResponseBody } from 'services/errors.js';
import type { OpenAPIHono } from '@hono/zod-openapi';

/**
 * 依存注入ミドルウェア付きのルート定義を生成する。
 * @param deps セッションルートに必要な依存オブジェクト。
 */
const createGetResultsRoute = (deps: SessionRouteDependencies) =>
  createRoute({
    method: 'get',
    path: '/sessions/{sessionId}/results',
    middleware: [createSessionDepsMiddleware(deps)] as const,
    description:
      'ゲーム終了後の最終結果とイベントログを取得します。完了前は 409 を返します。',
    request: {
      params: z.object({
        sessionId: z
          .string()
          .min(1)
          .describe('結果を取得する対象の `session_id`。'),
      }),
    },
    responses: {
      200: {
        description: 'セッションが完了しており、最終結果が取得できました。',
        content: {
          'application/json': {
            schema: sessionResultsResponseSchema,
          },
        },
      },
      404: {
        description: 'セッションが存在しません。',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      409: {
        description: 'セッションがまだ完了していないため結果を取得できません。',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

/**
 * 完了済みセッションの最終結果 GET ルートを登録する。
 * @param app OpenAPIHono インスタンス。
 * @param dependencies セッションストアなどの依存性。
 */
export const registerSessionResultsGetRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  const route = createGetResultsRoute(dependencies);

  app.openapi(route, (c) => {
    const deps = c.var.deps;
    const { sessionId } = c.req.valid('param');
    const envelope = deps.store.getEnvelope(sessionId);

    if (!envelope) {
      return respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');
    }

    const finalResults = envelope.snapshot.finalResults;

    if (finalResults === null) {
      return c.json(
        createErrorResponseBody({
          code: 'RESULT_NOT_READY',
          message: 'Session has not completed yet.',
          status: 409,
        }),
        409,
      );
    }

    return c.json(
      {
        session_id: envelope.snapshot.sessionId,
        final_results: finalResults,
        event_log: envelope.eventLog,
      },
      200,
    );
  });
};
