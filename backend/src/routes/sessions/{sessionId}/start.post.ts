import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  respondNotFound,
  respondValidationError,
} from 'routes/sessions/shared.js';
import { errorResponseSchema, sessionResponseSchema } from 'schema/sessions.js';
import { publishStateEvents } from 'services/ssePublisher.js';
import { calculateTurnDeadline } from 'services/timerSupervisor.js';
import { createSetupSnapshot } from 'states/setup.js';
import type { SessionEnv } from 'routes/sessions/types.js';
import type { GameSnapshot, PlayerSummary } from 'states/inMemoryGameStore.js';

const INITIAL_PLAYER_CHIPS = 11;

/**
 * ゲーム開始 POST ルートの静的定義。
 */
export const sessionStartPostRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/start',
  description:
    'ロビー状態のセッションでゲームを開始します。最低2人のプレイヤーが必要です。',
  request: {
    params: z.object({
      sessionId: z.string().openapi({
        description: 'ゲーム開始対象のセッションID。',
      }),
    }),
  },
  responses: {
    200: {
      description: 'ゲームが開始されました。',
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
    422: {
      description: 'ゲームを開始できる状態ではありません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

/**
 * プレイヤー情報からゲーム開始時のスナップショットを作成する。
 * @param existingSnapshot 既存のスナップショット。
 * @param players プレイヤー情報。
 * @param timestamp タイムスタンプ。
 */
const createGameStartSnapshot = (
  existingSnapshot: GameSnapshot,
  players: readonly PlayerSummary[],
  timestamp: string,
): GameSnapshot => {
  const seed =
    existingSnapshot.rngSeed === '' ? undefined : existingSnapshot.rngSeed;
  const setupOptions = seed === undefined ? undefined : { seed };
  const setup = createSetupSnapshot(
    players.map((player) => player.id),
    setupOptions,
  );

  const chips: Record<string, number> = {};
  const hands: Record<string, number[]> = {};

  for (const player of players) {
    chips[player.id] = INITIAL_PLAYER_CHIPS;
    hands[player.id] = [];
  }

  const [activeCard, ...remainingDeck] = setup.deck;
  const firstPlayerIndex = 0;
  const firstPlayerId =
    setup.playerOrder[firstPlayerIndex] ?? players[0]?.id ?? '';
  const awaitingAction = activeCard !== undefined;

  return {
    sessionId: existingSnapshot.sessionId,
    phase: 'setup',
    deck: remainingDeck,
    discardHidden: setup.discardHidden,
    playerOrder: setup.playerOrder,
    rngSeed: setup.rngSeed,
    players: [...players],
    chips,
    hands,
    centralPot: 0,
    turnState: {
      turn: awaitingAction ? 1 : 0,
      currentPlayerId: firstPlayerId,
      currentPlayerIndex: firstPlayerIndex,
      cardInCenter: activeCard ?? null,
      awaitingAction,
    },
    createdAt: existingSnapshot.createdAt,
    updatedAt: timestamp,
    finalResults: null,
    maxPlayers: existingSnapshot.maxPlayers,
  };
};

/**
 * ゲーム開始 POST ルートを持つ Hono アプリケーション。
 */
export const sessionStartPostApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionStartPostRoute,
  (c) => {
    const deps = c.var.deps;
    const { sessionId } = c.req.valid('param');

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
        'SESSION_ALREADY_STARTED',
        'Session has already started or completed.',
      );
    }

    // 最低2人必要
    if (snapshot.players.length < 2) {
      return respondValidationError(
        c,
        'NOT_ENOUGH_PLAYERS',
        'At least 2 players are required to start the game.',
      );
    }

    const timestamp = deps.now();
    const gameSnapshot = createGameStartSnapshot(
      snapshot,
      snapshot.players,
      timestamp,
    );

    // タイマーのデッドラインを設定
    if (gameSnapshot.turnState.awaitingAction) {
      gameSnapshot.turnState.deadline = calculateTurnDeadline(
        gameSnapshot.updatedAt,
        deps.turnTimeoutMs,
      );
    } else {
      gameSnapshot.turnState.deadline = null;
    }

    const updatedEnvelope = deps.store.saveSnapshot(gameSnapshot);

    // タイマー登録
    const initialDeadline = gameSnapshot.turnState.deadline;

    if (
      gameSnapshot.turnState.awaitingAction &&
      initialDeadline !== null &&
      initialDeadline !== undefined
    ) {
      deps.timerSupervisor.register(sessionId, initialDeadline);
    } else {
      deps.timerSupervisor.clear(sessionId);
    }

    // SSE でイベントを配信
    publishStateEvents(
      {
        sseGateway: deps.sseGateway,
        ruleHints: deps.ruleHintService,
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
