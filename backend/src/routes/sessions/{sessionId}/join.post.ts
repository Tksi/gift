import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  respondNotFound,
  respondValidationError,
} from 'routes/sessions/shared.js';
import {
  errorResponseSchema,
  joinSessionBodySchema,
  sessionResponseSchema,
} from 'schema/sessions.js';
import { publishStateEvents } from 'services/ssePublisher.js';
import type { SessionEnv } from 'routes/sessions/types.js';

/**
 * プレイヤー参加 POST ルートの静的定義。
 */
export const sessionJoinPostRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/join',
  description:
    'ロビー状態のセッションにプレイヤーを参加させます。全員が参加するとゲームを開始できます。',
  request: {
    params: z.object({
      sessionId: z.string().openapi({
        description: '参加対象のセッションID。',
      }),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: joinSessionBodySchema,
          example: {
            player_id: 'alice',
            display_name: 'Alice',
          },
        },
      },
      description: '参加するプレイヤーのIDと表示名。',
    },
  },
  responses: {
    200: {
      description: 'プレイヤーがセッションに参加しました。',
      content: {
        'application/json': {
          schema: sessionResponseSchema,
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
    409: {
      description: 'プレイヤーIDが既に使用されています。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    422: {
      description: 'セッションが参加可能な状態ではありません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

/**
 * プレイヤー参加 POST ルートを持つ Hono アプリケーション。
 */
export const sessionJoinPostApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionJoinPostRoute,
  (c) => {
    const deps = c.var.deps;
    const { sessionId } = c.req.valid('param');
    const body = c.req.valid('json');
    const playerId = body.player_id.trim();
    const displayName = body.display_name.trim();

    const envelope = deps.store.getEnvelope(sessionId);

    if (!envelope) {
      return respondNotFound(
        c,
        'SESSION_NOT_FOUND',
        `Session ${sessionId} not found.`,
      );
    }

    const snapshot = envelope.snapshot;

    // ロビー状態でない場合はエラー
    if (snapshot.phase !== 'waiting') {
      return respondValidationError(
        c,
        'SESSION_NOT_JOINABLE',
        'Session is not in waiting phase.',
      );
    }

    // 満員チェック
    if (snapshot.players.length >= snapshot.maxPlayers) {
      return respondValidationError(
        c,
        'SESSION_FULL',
        'Session has reached maximum player count.',
      );
    }

    // プレイヤーID重複チェック
    if (snapshot.players.some((p) => p.id === playerId)) {
      return c.json(
        {
          error: {
            code: 'PLAYER_ID_NOT_UNIQUE',
            message: `Player id ${playerId} is already taken.`,
            reason_code: 'CONFLICT',
            instruction: 'Choose a different player id.',
          },
        },
        409,
      );
    }

    // プレイヤーを追加
    const updatedSnapshot = {
      ...snapshot,
      players: [...snapshot.players, { id: playerId, displayName }],
      updatedAt: deps.now(),
    };

    const updatedEnvelope = deps.store.saveSnapshot(updatedSnapshot);

    // SSE でイベントを配信
    publishStateEvents(
      {
        sseGateway: deps.sseGateway,
      },
      updatedEnvelope.snapshot,
      updatedEnvelope.version,
    );

    return c.json(
      {
        session_id: updatedEnvelope.snapshot.sessionId,
        state_version: updatedEnvelope.version,
        state: updatedEnvelope.snapshot,
      },
      200,
    );
  },
);
