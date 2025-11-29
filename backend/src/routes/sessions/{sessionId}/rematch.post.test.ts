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

/**
 * ゲームを完了状態にするヘルパー。
 * @param store ゲームストア。
 * @param sessionId セッションID。
 */
const completeGame = (
  store: ReturnType<typeof createTestApp>['store'],
  sessionId: string,
) => {
  const snapshot = store.getSnapshot(sessionId);

  if (!snapshot) throw new Error('Session not found');

  const completedSnapshot: GameSnapshot = {
    ...snapshot,
    phase: 'completed',
    finalResults: {
      placements: snapshot.players.map((player, index) => ({
        rank: index + 1,
        playerId: player.id,
        score: 10 - index,
        chipsRemaining: 11 - index,
        cards: [3, 4, 5],
        cardSets: [[3, 4, 5]],
      })),
      tieBreak: null,
    },
    deck: [],
    turnState: {
      ...snapshot.turnState,
      awaitingAction: false,
      cardInCenter: null,
    },
  };

  store.saveSnapshot(completedSnapshot);
};

describe('POST /sessions/{sessionId}/rematch', () => {
  it('ゲーム終了状態のセッションで再戦を開始できる', async () => {
    const { app, store, timerSupervisor } = createTestApp();
    await createWaitingSession(app, 3, 'test-seed');

    // 2人参加
    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    // ゲーム開始
    await app.request('/sessions/session-test/start', { method: 'POST' });

    // ゲームを完了状態にする
    completeGame(store, 'session-test');

    const response = await app.request('/sessions/session-test/rematch', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as SessionResponse;

    // 新しいゲームが開始されている
    expect(payload.state.phase).toBe('setup');
    expect(payload.state.players).toHaveLength(2);
    expect(payload.state.deck.length).toBeGreaterThan(0);
    expect(payload.state.turnState.awaitingAction).toBe(true);
    expect(typeof payload.state.turnState.cardInCenter).toBe('number');
    // 結果がクリアされている
    expect(payload.state.finalResults).toBeNull();
    // チップが初期値に戻っている
    expect(payload.state.chips.alice).toBe(11);
    expect(payload.state.chips.bob).toBe(11);
    // 手札がクリアされている
    expect(payload.state.hands.alice).toEqual([]);
    expect(payload.state.hands.bob).toEqual([]);

    // タイマーが登録される
    expect(timerSupervisor.register).toHaveBeenCalled();
  });

  it('3人の参加者で再戦を開始できる', async () => {
    const { app, store } = createTestApp();
    await createWaitingSession(app, 3, 'test-seed');

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');
    await joinPlayer(app, 'session-test', 'carl', 'Carl');

    await app.request('/sessions/session-test/start', { method: 'POST' });
    completeGame(store, 'session-test');

    const response = await app.request('/sessions/session-test/rematch', {
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

    const response = await app.request('/sessions/non-existent/rematch', {
      method: 'POST',
    });

    expect(response.status).toBe(404);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('待機中のセッションには 422 を返す', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    const response = await app.request('/sessions/session-test/rematch', {
      method: 'POST',
    });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_COMPLETED');
  });

  it('進行中のセッションには 422 を返す', async () => {
    const { app } = createTestApp();
    await createWaitingSession(app, 3);

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    // ゲーム開始（進行中状態）
    await app.request('/sessions/session-test/start', { method: 'POST' });

    const response = await app.request('/sessions/session-test/rematch', {
      method: 'POST',
    });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_COMPLETED');
  });

  it('再戦ごとに新しいシードでシャッフルされる', async () => {
    const { app, store } = createTestApp();
    await createWaitingSession(app, 3);

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    // 1回目のゲーム
    await app.request('/sessions/session-test/start', { method: 'POST' });
    const firstSnapshot = store.getSnapshot('session-test');
    const firstSeed = firstSnapshot?.rngSeed;

    // ゲーム完了
    completeGame(store, 'session-test');

    // 再戦
    const response = await app.request('/sessions/session-test/rematch', {
      method: 'POST',
    });
    const payload = (await response.json()) as SessionResponse;

    // 新しいシードが使われている
    expect(payload.state.rngSeed).not.toBe(firstSeed);
  });

  it('再戦後にプレイヤー情報が維持される', async () => {
    const { app, store } = createTestApp();
    await createWaitingSession(app, 3);

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    await app.request('/sessions/session-test/start', { method: 'POST' });
    completeGame(store, 'session-test');

    const response = await app.request('/sessions/session-test/rematch', {
      method: 'POST',
    });
    const payload = (await response.json()) as SessionResponse;

    // プレイヤー情報が維持されている
    const playerIds = payload.state.players.map((p) => p.id);
    expect(playerIds).toContain('alice');
    expect(playerIds).toContain('bob');

    const playerNames = payload.state.players.map((p) => p.displayName);
    expect(playerNames).toContain('Alice');
    expect(playerNames).toContain('Bob');
  });

  it('セッションIDが変わらない', async () => {
    const { app, store } = createTestApp();
    await createWaitingSession(app, 3);

    await joinPlayer(app, 'session-test', 'alice', 'Alice');
    await joinPlayer(app, 'session-test', 'bob', 'Bob');

    await app.request('/sessions/session-test/start', { method: 'POST' });
    completeGame(store, 'session-test');

    const response = await app.request('/sessions/session-test/rematch', {
      method: 'POST',
    });
    const payload = (await response.json()) as SessionResponse;

    expect(payload.session_id).toBe('session-test');
    expect(payload.state.sessionId).toBe('session-test');
  });

  it('再戦時にプレイヤーの並び順がシャッフルされる', async () => {
    // 複数回試行して、少なくとも1回は異なる順序になることを確認
    // 7人プレイヤーで並び順が変わらない確率は1/5040（7!）
    let orderChanged = false;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const testApp = createTestApp();

      // 参加順序を固定
      const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];

      await testApp.app.request('/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ max_players: 7 }),
      });

      for (const pid of playerIds) {
        await joinPlayer(testApp.app, 'session-test', pid, pid.toUpperCase());
      }

      await testApp.app.request('/sessions/session-test/start', {
        method: 'POST',
      });

      const beforeSnapshot = testApp.store.getSnapshot('session-test');
      const orderBefore = beforeSnapshot?.players.map((p) => p.id);

      completeGame(testApp.store, 'session-test');

      const response = await testApp.app.request(
        '/sessions/session-test/rematch',
        { method: 'POST' },
      );
      const payload = (await response.json()) as SessionResponse;
      const orderAfter = payload.state.players.map((p) => p.id);

      // players 配列と playerOrder が一致することを確認
      expect(orderAfter).toEqual(payload.state.playerOrder);

      // 順序が変わったかチェック
      if (JSON.stringify(orderBefore) !== JSON.stringify(orderAfter)) {
        orderChanged = true;

        break;
      }
    }

    expect(orderChanged).toBe(true);
  });
});
