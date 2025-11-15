import { createRoute } from '@hono/zod-openapi';
import {
  respondValidationError,
  toSessionResponse,
} from 'routes/sessions/shared.js';
import {
  createSessionBodySchema,
  errorResponseSchema,
  sessionResponseSchema,
} from 'schema/sessions.js';
import { createSetupSnapshot } from 'states/setup.js';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';
import type { PlayerRegistration } from 'schema/players.js';
import type { GameSnapshot, PlayerSummary } from 'states/inMemoryGameStore.js';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 7;
const INITIAL_PLAYER_CHIPS = 11;

const createSessionRoute = createRoute({
  method: 'post',
  path: '/sessions',
  description:
    '指定されたプレイヤー情報と任意のシード値を用いてゲームのセットアップを実行し、初期スナップショットと状態バージョンを返します。',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createSessionBodySchema,
          example: {
            seed: 'optional-seed-string',
            players: [
              { id: 'alice', display_name: 'Alice' },
              { id: 'bob', display_name: 'Bob' },
            ],
          },
        },
      },
      description:
        'プレイヤー ID と表示名、そして任意の乱数シード。ID は 2〜7 名、英数 + `_`/`-` のみ許可されます。',
    },
  },
  responses: {
    201: {
      description: '新しいセッションが作成され、初期状態が返却されました。',
      content: {
        'application/json': {
          schema: sessionResponseSchema,
        },
      },
    },
    422: {
      description:
        '入力検証に失敗しました。プレイヤー人数や ID の重複などを `error.code` で示します。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

type NormalizedPlayer = PlayerSummary;

type PlayerConstraintFailure = {
  ok: false;
  code: string;
  message: string;
};

type PlayerConstraintSuccess = {
  ok: true;
  players: NormalizedPlayer[];
};

const ensurePlayerConstraints = (
  players: readonly PlayerRegistration[],
): PlayerConstraintFailure | PlayerConstraintSuccess => {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    return {
      ok: false,
      code: 'PLAYER_COUNT_INVALID',
      message: `Players must contain between ${MIN_PLAYERS} and ${MAX_PLAYERS} entries.`,
    };
  }

  const normalized: NormalizedPlayer[] = [];
  const existing = new Set<string>();

  for (const player of players) {
    const id = player.id.trim();
    const displayName = player.display_name.trim();

    if (id.length === 0) {
      return {
        ok: false,
        code: 'PLAYER_ID_INVALID',
        message: 'Player id cannot be empty.',
      };
    }

    if (displayName.length === 0) {
      return {
        ok: false,
        code: 'PLAYER_NAME_INVALID',
        message: `Player ${player.id} display name cannot be empty.`,
      };
    }

    if (existing.has(id)) {
      return {
        ok: false,
        code: 'PLAYER_ID_NOT_UNIQUE',
        message: `Player id ${id} is duplicated.`,
      };
    }

    existing.add(id);
    normalized.push({ id, displayName });
  }

  return { ok: true, players: normalized };
};

const createInitialSnapshot = (
  sessionId: string,
  players: readonly NormalizedPlayer[],
  timestamp: string,
  seed?: string,
): GameSnapshot => {
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
    sessionId,
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
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

/**
 * セッション作成 POST ルートをアプリケーションへ登録する。
 * @param app OpenAPIHono インスタンス。
 * @param dependencies ストアや時刻生成などの依存オブジェクト。
 */
export const registerSessionPostRoute = (
  app: OpenAPIHono,
  dependencies: SessionRouteDependencies,
) => {
  app.openapi(createSessionRoute, (c) => {
    const payload = c.req.valid('json');
    const check = ensurePlayerConstraints(payload.players);

    if (check.ok) {
      const sessionId = dependencies.generateSessionId();
      const snapshot = createInitialSnapshot(
        sessionId,
        check.players,
        dependencies.now(),
        payload.seed,
      );

      const envelope = dependencies.store.saveSnapshot(snapshot);

      return c.json(toSessionResponse(envelope), 201);
    }

    return respondValidationError(c, check.code, check.message);
  });
};
