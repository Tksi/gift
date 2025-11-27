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
 * @param seed ゲームのシード値。
 */
const createWaitingSession = async (
  app: ReturnType<typeof createTestApp>['app'],
  maxPlayers = 3,
  seed?: string,
) => {
  const response = await app.request('/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ max_players: maxPlayers, seed }),
  });

  return (await response.json()) as SessionResponse;
};

/**
 * プレイヤーを参加させるヘルパー。
 * @param app テスト用Honoアプリケーション。
 * @param sessionId 参加するセッションID。
 * @param playerId プレイヤーID。
 * @param displayName プレイヤーの表示名。
 */
const joinPlayer = async (
  app: ReturnType<typeof createTestApp>['app'],
  sessionId: string,
  playerId: string,
  displayName: string,
) => {
  const response = await app.request(`/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ player_id: playerId, display_name: displayName }),
  });

  return response;
};

describe('POST /sessions/{sessionId}/start', () => {
  it('2人以上参加しているセッションでゲームを開始できる', async () => {
    const { app, timerSupervisor } = createTestApp();
    await createWaitingSession(app, 3, 'test-seed');

    // 2人参加
    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    const response = await app.request('/sessions/session-test/start', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as SessionResponse;

    expect(payload.state.phase).toBe('setup');
    expect(payload.state.players).toHaveLength(2);
    expect(payload.state.deck.length).toBeGreaterThan(0);
    expect(payload.state.turnState.awaitingAction).toBe(true);
    expect(typeof payload.state.turnState.cardInCenter).toBe('number');

    // タイマーが登録される
    expect(timerSupervisor.register).toHaveBeenCalled();
  });

  it('3人全員参加後にゲームを開始できる', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3, 'test-seed');

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');
    await joinPlayer(app, 'session-test', 'carl', 'Carl');

    const response = await app.request('/sessions/session-test/start', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as SessionResponse;

    expect(payload.state.players).toHaveLength(3);
    expect(payload.state.chips).toEqual({
      alice: 11,
      bob: 11,
      carl: 11,
    });
  });

  it('存在しないセッションには 404 を返す', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions/non-existent/start', {
      method: 'POST',
    });

    expect(response.status).toBe(404);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('1人しか参加していない場合は 422 を返す', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    await joinPlayer(app, 'session-test', 'alice', 'Alice');

    const response = await app.request('/sessions/session-test/start', {
      method: 'POST',
    });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('誰も参加していない場合は 422 を返す', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    const response = await app.request('/sessions/session-test/start', {
      method: 'POST',
    });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('既に開始済みのセッションには 422 を返す', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    // 1回目の開始
    await app.request('/sessions/session-test/start', { method: 'POST' });

    // 2回目の開始を試みる
    const response = await app.request('/sessions/session-test/start', {
      method: 'POST',
    });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_ALREADY_STARTED');
  });
});
