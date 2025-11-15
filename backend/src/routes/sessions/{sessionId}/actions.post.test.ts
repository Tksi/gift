import { createApp } from 'app.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

/**
 * テスト用アプリケーションを生成する。
 */
const createTestApp = () => {
  const store = createInMemoryGameStore();

  const app = createApp({
    store,
    now: () => '2025-01-01T00:00:00.000Z',
    generateSessionId: () => 'session-test',
  });

  return { app, store };
};

type SessionResponse = {
  session_id: string;
  state_version: string;
  state: GameSnapshot;
};

type ActionResponse = SessionResponse & {
  turn_context: {
    turn: number;
    current_player_id: string;
    card_in_center: number | null;
    awaiting_action: boolean;
    central_pot: number;
    chips: Record<string, number>;
  };
};

type ErrorResponse = {
  error: {
    code: string;
  };
};

describe('POST /sessions/{sessionId}/actions', () => {
  it('手番プレイヤーのアクションを反映し turn_context に主要情報を含めて返す', async () => {
    const { app } = createTestApp();

    const createResponse = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        players: [
          { id: 'alice', display_name: 'Alice' },
          { id: 'bob', display_name: 'Bob' },
        ],
      }),
    });

    const created = (await createResponse.json()) as SessionResponse;

    const actorId = created.state.turnState.currentPlayerId;
    const playerOrder = created.state.playerOrder;
    const currentIndex = created.state.turnState.currentPlayerIndex;
    const nextIndex =
      playerOrder.length === 0 ? 0 : (currentIndex + 1) % playerOrder.length;
    const nextPlayerId = playerOrder[nextIndex] ?? actorId;
    const actorInitialChips = created.state.chips[actorId] ?? 0;

    const actionResponse = await app.request(
      `/sessions/${created.session_id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          command_id: 'cmd-1',
          state_version: created.state_version,
          player_id: actorId,
          action: 'placeChip',
        }),
      },
    );

    expect(actionResponse.status).toBe(200);
    const payload = (await actionResponse.json()) as ActionResponse;

    expect(payload.session_id).toBe(created.session_id);
    expect(payload.state_version).not.toBe(created.state_version);
    expect(payload.state.centralPot).toBe(1);
    expect(payload.state.chips[actorId]).toBe(actorInitialChips - 1);
    expect(payload.turn_context.central_pot).toBe(1);
    expect(payload.turn_context.current_player_id).toBe(nextPlayerId);
    expect(payload.turn_context.chips[actorId]).toBe(actorInitialChips - 1);
    expect(payload.turn_context.turn).toBe(payload.state.turnState.turn);
  });

  it('state_version が一致しない場合は 409 を返す', async () => {
    const { app } = createTestApp();

    const createResponse = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        players: [
          { id: 'alice', display_name: 'Alice' },
          { id: 'bob', display_name: 'Bob' },
        ],
      }),
    });

    const created = (await createResponse.json()) as SessionResponse;

    const actionResponse = await app.request(
      `/sessions/${created.session_id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          command_id: 'cmd-2',
          state_version: 'stale-version',
          player_id: 'alice',
          action: 'placeChip',
        }),
      },
    );

    expect(actionResponse.status).toBe(409);
    const payload = (await actionResponse.json()) as ErrorResponse;
    expect(payload.error.code).toBe('STATE_VERSION_MISMATCH');
  });

  it('存在しないセッションを指定すると 404 を返す', async () => {
    const { app } = createTestApp();

    const actionResponse = await app.request('/sessions/unknown/actions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        command_id: 'cmd-missing',
        state_version: 'version',
        player_id: 'alice',
        action: 'placeChip',
      }),
    });

    expect(actionResponse.status).toBe(404);
    const payload = (await actionResponse.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_FOUND');
  });
});
