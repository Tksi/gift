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
 * 再戦 POST ルートの静的定義。
 */
export const sessionRematchPostRoute = createRoute({
  method: 'post',
  path: '/sessions/{sessionId}/rematch',
  description:
    'ゲーム終了状態のセッションで再戦を行います。同じ参加者で新しいゲームを開始します。',
  request: {
    params: z.object({
      sessionId: z.string().openapi({
        description: '再戦対象のセッションID。',
      }),
    }),
  },
  responses: {
    200: {
      description: '再戦が開始されました。',
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
      description: '再戦を開始できる状態ではありません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

/**
 * 再戦時のスナップショットを作成する。
 * @param existingSnapshot 既存のスナップショット。
 * @param players プレイヤー情報。
 * @param timestamp タイムスタンプ。
 */
const createRematchSnapshot = (
  existingSnapshot: GameSnapshot,
  players: readonly PlayerSummary[],
  timestamp: string,
): GameSnapshot => {
  // 新しいシードでデッキをシャッフル
  const setup = createSetupSnapshot(players.map((player) => player.id));

  const chips: Record<string, number> = {};
  const hands: Record<string, number[]> = {};

  for (const player of players) {
    chips[player.id] = INITIAL_PLAYER_CHIPS;
    hands[player.id] = [];
  }

  // players 配列を playerOrder の順序に並び替え
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const orderedPlayers = setup.playerOrder
    .map((id) => playerMap.get(id))
    .filter((p): p is PlayerSummary => p !== undefined);

  const [activeCard, ...remainingDeck] = setup.deck;
  const firstPlayerIndex = 0;
  const firstPlayerId =
    setup.playerOrder[firstPlayerIndex] ?? orderedPlayers[0]?.id ?? '';
  const awaitingAction = activeCard !== undefined;

  return {
    sessionId: existingSnapshot.sessionId,
    phase: 'setup',
    deck: remainingDeck,
    discardHidden: setup.discardHidden,
    playerOrder: setup.playerOrder,
    rngSeed: setup.rngSeed,
    players: orderedPlayers,
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
 * 再戦 POST ルートを持つ Hono アプリケーション。
 */
export const sessionRematchPostApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionRematchPostRoute,
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

    // 終了状態でない場合はエラー
    if (snapshot.phase !== 'completed') {
      return respondValidationError(
        c,
        'SESSION_NOT_COMPLETED',
        'Session must be in completed state to start a rematch.',
      );
    }

    // プレイヤーが2人未満の場合はエラー
    if (snapshot.players.length < 2) {
      return respondValidationError(
        c,
        'NOT_ENOUGH_PLAYERS',
        'At least 2 players are required to start a rematch.',
      );
    }

    const timestamp = deps.now();
    const gameSnapshot = createRematchSnapshot(
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

    // コマンドID履歴をクリア
    envelope.processedCommands.clear();

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
