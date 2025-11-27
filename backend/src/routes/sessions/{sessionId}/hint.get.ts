import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { respondNotFound } from 'routes/sessions/shared.js';
import {
  errorResponseSchema,
  sessionHintResponseSchema,
} from 'schema/sessions.js';
import type {
  SessionEnv,
  SessionRouteDependencies,
} from 'routes/sessions/types.js';

/**
 * ルールヒント取得 GET ルートの静的定義。
 */
export const sessionHintGetRoute = createRoute({
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
 * ルールヒント取得 GET ルートを持つ Hono アプリケーション。
 */
export const sessionHintGetApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionHintGetRoute,
  (c) => {
    const deps = c.var.deps;
    const { sessionId } = c.req.valid('param');
    const envelope = deps.store.getEnvelope(sessionId);

    if (!envelope) {
      return respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');
    }

    const cached = deps.ruleHintService.getLatestHint(sessionId);
    const latest =
      cached && cached.stateVersion === envelope.version
        ? cached
        : deps.ruleHintService.refreshHint(envelope.snapshot, envelope.version);

    return c.json(toHintPayload(sessionId, envelope.version, latest), 200);
  },
);
