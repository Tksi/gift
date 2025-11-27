import { createApp } from 'app.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it, vi } from 'vitest';
import type { TimerSupervisor } from 'services/timerSupervisor.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

/**
 * テスト用アプリケーションを生成する。
 */
const createTestApp = () => {
  const store = createInMemoryGameStore();
  const timerSupervisor: TimerSupervisor = {
    register: vi.fn(),
    clear: vi.fn(),
    restore: vi.fn(),
  };

  const app = createApp({
    store,
    now: () => '2025-01-01T00:00:00.000Z',
    generateSessionId: () => 'session-test',
    timerSupervisor,
    turnTimeoutMs: 30_000,
  });

  return { app, store, timerSupervisor };
};

type SessionResponse = {
  session_id: string;
  state_version: string;
  state: GameSnapshot;
};

type ErrorResponse = {
  error: {
    code: string;
    reason_code?: string;
    instruction?: string;
  };
};

/**
 * ロビー状態のセッションを作成するヘルパー。
 * @param app テスト用Honoアプリケーション。
 * @param maxPlayers 最大プレイヤー人数。
 */
const createWaitingSession = async (
  app: ReturnType<typeof createTestApp>['app'],
  maxPlayers = 3,
) => {
  const response = await app.request('/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ max_players: maxPlayers }),
  });

  return (await response.json()) as SessionResponse;
};

describe('POST /sessions/{sessionId}/join', () => {
  it('ロビー状態のセッションにプレイヤーが参加できる', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    const response = await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        player_id: 'alice',
        display_name: 'Alice',
      }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as SessionResponse;

    expect(payload.state.players).toEqual([
      { id: 'alice', displayName: 'Alice' },
    ]);
    expect(payload.state.phase).toBe('waiting');
  });

  it('複数のプレイヤーが順次参加できる', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    // 1人目参加
    await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player_id: 'alice', display_name: 'Alice' }),
    });

    // 2人目参加
    const response = await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player_id: 'bob', display_name: 'Bob' }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as SessionResponse;

    expect(payload.state.players).toEqual([
      { id: 'alice', displayName: 'Alice' },
      { id: 'bob', displayName: 'Bob' },
    ]);
  });

  it('存在しないセッションには 404 を返す', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions/non-existent/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player_id: 'alice', display_name: 'Alice' }),
    });

    expect(response.status).toBe(404);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('重複したプレイヤーIDは 409 を返す', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    // 1人目参加
    await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player_id: 'alice', display_name: 'Alice' }),
    });

    // 同じIDで参加を試みる
    const response = await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        player_id: 'alice',
        display_name: 'Another Alice',
      }),
    });

    expect(response.status).toBe(409);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('PLAYER_ID_NOT_UNIQUE');
  });

  it('満員のセッションには参加できない', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 2);

    // 2人参加して満員に
    await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player_id: 'alice', display_name: 'Alice' }),
    });
    await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player_id: 'bob', display_name: 'Bob' }),
    });

    // 3人目が参加を試みる
    const response = await app.request('/sessions/session-test/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player_id: 'carl', display_name: 'Carl' }),
    });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_FULL');
  });
});
