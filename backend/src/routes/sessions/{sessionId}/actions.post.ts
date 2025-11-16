import { createRoute, z } from '@hono/zod-openapi';
import {
  errorResponseSchema,
  sessionActionBodySchema,
  sessionActionResponseSchema,
} from 'schema/sessions.js';
import { type ServiceError, createErrorResponseBody } from 'services/errors.js';
import { publishStateEvents } from 'services/ssePublisher.js';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const postSessionActionRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/actions',
  description:
    '手番プレイヤーまたはシステムからのアクションコマンドを TurnDecisionService へ転送し、最新スナップショットと要約情報を返します。',
  request: {
    params: z.object({
      sessionId: z
        .string()
        .min(1)
        .describe('アクションを送信する対象の `session_id`。'),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: sessionActionBodySchema,
          example: {
            command_id: 'cmd-123',
            state_version: 'etag-hex',
            player_id: 'alice',
            action: 'placeChip',
          },
        },
      },
    },
  },
  responses: {
    200: {
      description:
        'アクションが適用され、新しい状態とターン要約が返却されました。',
      content: {
        'application/json': {
          schema: sessionActionResponseSchema,
        },
      },
    },
    404: {
      description: 'セッションまたはプレイヤーが存在しません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description:
        '`state_version` が最新と一致しない、または完了済みゲームなどのため競合しました。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    422: {
      description: '入力やチップ残量などの検証に失敗しました。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const createTurnContext = (snapshot: GameSnapshot) => ({
  turn: snapshot.turnState.turn,
  current_player_id: snapshot.turnState.currentPlayerId,
  card_in_center: snapshot.turnState.cardInCenter,
  awaiting_action: snapshot.turnState.awaitingAction,
  central_pot: snapshot.centralPot,
  chips: snapshot.chips,
});

const toActionResponse = (snapshot: GameSnapshot, version: string) => ({
  session_id: snapshot.sessionId,
  state_version: version,
  state: snapshot,
  turn_context: createTurnContext(snapshot),
});

const isServiceError = (err: unknown): err is ServiceError =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  'status' in err &&
  typeof (err as ServiceError).code === 'string' &&
  typeof (err as ServiceError).status === 'number';

/**
 * プレイヤーアクション POST ルートを登録する。
 * @param app OpenAPIHono インスタンス。
 * @param dependencies セッションストアやサービス群。
 */
export const registerSessionActionsPostRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  app.openapi(postSessionActionRoute, async (c) => {
    const { sessionId } = c.req.valid('param');
    const payload = c.req.valid('json');

    try {
      const result = await dependencies.turnService.applyCommand({
        sessionId,
        commandId: payload.command_id,
        expectedVersion: payload.state_version,
        playerId: payload.player_id,
        action: payload.action,
      });

      publishStateEvents(
        {
          sseGateway: dependencies.sseGateway,
          ruleHints: dependencies.ruleHintService,
        },
        result.snapshot,
        result.version,
      );

      return c.json(toActionResponse(result.snapshot, result.version), 200);
    } catch (err) {
      if (isServiceError(err)) {
        if ([404, 409, 422].includes(err.status)) {
          const status = err.status as 404 | 409 | 422;
          const body = createErrorResponseBody({
            code: err.code,
            message: err.message,
            status,
          });
          dependencies.sseGateway.publishSystemError(sessionId, body.error);

          return c.json(body, status);
        }

        throw err;
      }

      throw err;
    }
  });
};
