import { createRoute, z } from '@hono/zod-openapi';
import { respondNotFound } from 'routes/sessions/shared.js';
import {
  errorResponseSchema,
  sessionHintResponseSchema,
} from 'schema/sessions.js';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';

const getSessionHintRoute = createRoute({
  method: 'get',
  path: '/sessions/{sessionId}/hint',
  description:
    '現在のカード・チップ状況に基づくルールヘルプを返し、UI が即時に意思決定ヒントを表示できるようにします。',
  request: {
    params: z.object({
      sessionId: z.string().min(1).describe('対象となる `session_id`。'),
    }),
  },
  responses: {
    200: {
      description: '最新のルールヒントを取得できました。',
      content: {
        'application/json': {
          schema: sessionHintResponseSchema,
        },
      },
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

const toHintPayload = (
  sessionId: string,
  stateVersion: string,
  stored: Exclude<
    ReturnType<SessionRouteDependencies['ruleHintService']['getLatestHint']>,
    null
  >,
) => ({
  session_id: sessionId,
  state_version: stateVersion,
  generated_from_version: stored.stateVersion,
  hint: {
    text: stored.hint.text,
    emphasis: stored.hint.emphasis,
    turn: stored.hint.turn,
    generated_at: stored.hint.generatedAt,
  },
});

/**
 * ルールヘルプ取得ルートを登録する。
 * @param app OpenAPIHono インスタンス。
 * @param dependencies セッションストアとサービス群。
 */
export const registerSessionHintGetRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  app.openapi(getSessionHintRoute, (c) => {
    const { sessionId } = c.req.valid('param');
    const envelope = dependencies.store.getEnvelope(sessionId);

    if (!envelope) {
      return respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');
    }

    const cached = dependencies.ruleHintService.getLatestHint(sessionId);
    const latest =
      cached && cached.stateVersion === envelope.version
        ? cached
        : dependencies.ruleHintService.refreshHint(
            envelope.snapshot,
            envelope.version,
          );

    return c.json(toHintPayload(sessionId, envelope.version, latest), 200);
  });
};
