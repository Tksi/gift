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

describe('POST /sessions', () => {
  it('プレイヤー人数を指定してロビー状態のセッションを作成する', async () => {
    const { app, store } = createTestApp();

    const response = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        max_players: 3,
        seed: 'unit-test-seed',
      }),
    });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as SessionResponse;

    expect(payload.session_id).toBe('session-test');
    expect(typeof payload.state_version).toBe('string');

    const snapshot = payload.state;

    expect(snapshot).toMatchObject({
      sessionId: 'session-test',
      phase: 'waiting',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      maxPlayers: 3,
      centralPot: 0,
    });

    // ロビー状態なのでプレイヤーは空
    expect(snapshot.players).toEqual([]);
    expect(snapshot.playerOrder).toEqual([]);
    expect(snapshot.deck).toEqual([]);
    expect(snapshot.turnState.awaitingAction).toBe(false);

    const envelope = store.getEnvelope('session-test');
    expect(envelope?.version).toBe(payload.state_version);
    expect(envelope?.snapshot).toEqual(snapshot);
  });

  it('シードなしでもセッションを作成できる', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        max_players: 4,
      }),
    });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as SessionResponse;
    expect(payload.state.maxPlayers).toBe(4);
    expect(payload.state.rngSeed).toBe('');
  });

  it('プレイヤー数が1名の場合は 400 を返す（スキーマバリデーション）', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        max_players: 1,
      }),
    });

    // Zodスキーマでmin(2)が設定されているため400が返る
    expect(response.status).toBe(400);
  });

  it('プレイヤー数が8名以上の場合も 400 を返す（スキーマバリデーション）', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        max_players: 8,
      }),
    });

    // Zodスキーマでmax(7)が設定されているため400が返る
    expect(response.status).toBe(400);
  });

  it('セッション作成時に1日以上前のセッションを削除する', async () => {
    const store = createInMemoryGameStore();
    const timerSupervisor: TimerSupervisor = {
      register: vi.fn(),
      clear: vi.fn(),
      restore: vi.fn(),
    };

    // 2日前の日時
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    // 古いセッションを作成
    store.saveSnapshot({
      sessionId: 'old-session',
      phase: 'waiting',
      deck: [],
      discardHidden: [],
      playerOrder: [],
      rngSeed: '',
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
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: twoDaysAgo.toISOString(),
      finalResults: null,
      maxPlayers: 3,
    });

    expect(store.getSnapshot('old-session')).toBeDefined();

    const app = createApp({
      store,
      now: () => new Date().toISOString(),
      generateSessionId: () => 'new-session',
      timerSupervisor,
      turnTimeoutMs: 30_000,
    });

    // 新しいセッションを作成
    const response = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        max_players: 3,
      }),
    });

    expect(response.status).toBe(201);

    // 古いセッションが削除されている
    expect(store.getSnapshot('old-session')).toBeUndefined();
    // 新しいセッションは存在する
    expect(store.getSnapshot('new-session')).toBeDefined();
  });
});
