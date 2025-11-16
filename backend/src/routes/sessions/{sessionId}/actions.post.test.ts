import { createApp } from 'app.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it, vi } from 'vitest';
import type { CreateAppOptions } from 'app.js';
import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

/**
 * テスト用アプリケーションを生成する。
 */
type TestAppOverrides = Partial<CreateAppOptions>;

const createTestApp = (overrides: TestAppOverrides = {}) => {
  const { store: providedStore, ...rest } = overrides;
  const store = providedStore ?? createInMemoryGameStore();

  const app = createApp({
    store,
    now: () => '2025-01-01T00:00:00.000Z',
    generateSessionId: () => 'session-test',
    ...rest,
  });

  return { app, store };
};

const createSseGatewayStub = (): SseBroadcastGateway => {
  const connect = vi.fn(() => ({ disconnect: vi.fn() }));
  const publishStateDelta = vi.fn();
  const publishStateFinal = vi.fn();
  const publishSystemError = vi.fn();
  const publishEventLog = vi.fn();
  const publishRuleHint = vi.fn();

  return {
    connect,
    publishStateDelta,
    publishStateFinal,
    publishSystemError,
    publishEventLog,
    publishRuleHint,
  };
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
    reason_code: string;
    instruction: string;
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
    expect(payload.error.reason_code).toBe('STATE_CONFLICT');
    expect(payload.error.instruction).toBe(
      'Fetch the latest state and resend the command.',
    );
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
    expect(payload.error.reason_code).toBe('RESOURCE_NOT_FOUND');
    expect(payload.error.instruction).toBe(
      'Verify the identifier or create a new session.',
    );
  });

  it('state_version 競合時に SSE system.error へ同一フォーマットのエラーを送信する', async () => {
    const gateway = createSseGatewayStub();
    const { app } = createTestApp({ sseGateway: gateway });

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

    await app.request(`/sessions/${created.session_id}/actions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        command_id: 'cmd-fail',
        state_version: 'stale',
        player_id: created.state.turnState.currentPlayerId,
        action: 'placeChip',
      }),
    });

    expect(gateway.publishSystemError).toHaveBeenCalledWith(
      created.session_id,
      expect.objectContaining({
        code: 'STATE_VERSION_MISMATCH',
        reason_code: 'STATE_CONFLICT',
        instruction: 'Fetch the latest state and resend the command.',
      }),
    );
  });
});
