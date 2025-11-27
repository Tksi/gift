import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { respondValidationError } from 'routes/sessions/shared.js';
import {
  createSessionBodySchema,
  errorResponseSchema,
  sessionResponseSchema,
} from 'schema/sessions.js';
import type { SessionEnv } from 'routes/sessions/types.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 7;

/** 古いセッションを削除する閾値（ミリ秒）: 1日 */
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * セッション作成 POST ルートの静的定義。
 */
export const sessionPostRoute = createRoute({
  method: 'post',
  path: '/sessions',
  description:
    '指定されたプレイヤー人数でロビー状態のセッションを作成します。プレイヤーは /sessions/{id}/join で参加します。',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createSessionBodySchema,
          example: {
            max_players: 3,
            seed: 'optional-seed-string',
          },
        },
      },
      description: '参加可能なプレイヤー人数（2〜7人）と任意の乱数シード。',
    },
  },
  responses: {
    201: {
      description:
        '新しいセッション（ロビー状態）が作成され、初期状態が返却されました。',
      content: {
        'application/json': {
          schema: sessionResponseSchema,
        },
      },
    },
    422: {
      description:
        '入力検証に失敗しました。プレイヤー人数などを `error.code` で示します。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

/**
 * ロビー状態の初期スナップショットを作成する。
 * @param sessionId セッションID。
 * @param maxPlayers 最大プレイヤー人数。
 * @param timestamp 作成日時。
 * @param seed 乱数シード（オプション）。
 */
const createWaitingSnapshot = (
  sessionId: string,
  maxPlayers: number,
  timestamp: string,
  seed?: string,
): GameSnapshot => ({
  sessionId,
  phase: 'waiting',
  deck: [],
  discardHidden: [],
  playerOrder: [],
  rngSeed: seed ?? '',
  players: [],
  chips: {},
  hands: {},
  centralPot: 0,
  turnState: {
    turn: 0,
    currentPlayerId: '',
    currentPlayerIndex: 0,
    cardInCenter: null,
    awaitingAction: false,
    deadline: null,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  finalResults: null,
  maxPlayers,
});

/**
 * セッション作成 POST ルートを持つ Hono アプリケーション。
 */
export const sessionPostApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionPostRoute,
  (c) => {
    const deps = c.var.deps;
    const payload = c.req.valid('json');
    const maxPlayers = payload.max_players;

    // プレイヤー人数のバリデーション
    if (maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS) {
      return respondValidationError(
        c,
        'PLAYER_COUNT_INVALID',
        `Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`,
      );
    }

    // 古いセッションをクリーンアップ（メモリリーク防止）
    const expiryThreshold = new Date(Date.now() - SESSION_EXPIRY_MS);
    deps.store.pruneSessionsOlderThan(expiryThreshold);

    const sessionId = deps.generateSessionId();
    const timestamp = deps.now();
    const snapshot = createWaitingSnapshot(
      sessionId,
      maxPlayers,
      timestamp,
      payload.seed,
    );

    const envelope = deps.store.saveSnapshot(snapshot);

    return c.json(
      {
        session_id: envelope.snapshot.sessionId,
        state_version: envelope.version,
        state: envelope.snapshot,
      },
      201,
    );
  },
);
