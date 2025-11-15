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

type ErrorResponse = {
  error: {
    code: string;
  };
};

describe('POST /sessions', () => {
  it('公平なセットアップで新規セッションを作成しスナップショットとバージョン情報を返す', async () => {
    const { app, store } = createTestApp();

    const response = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        seed: 'unit-test-seed',
        players: [
          { id: 'alice', display_name: 'Alice' },
          { id: 'bob', display_name: 'Bob' },
          { id: 'carl', display_name: 'Carl' },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as SessionResponse;

    expect(payload.session_id).toBe('session-test');
    expect(typeof payload.state_version).toBe('string');

    const snapshot = payload.state;

    expect(snapshot).toMatchObject({
      sessionId: 'session-test',
      phase: 'setup',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      rngSeed: 'unit-test-seed',
      centralPot: 0,
    });

    expect(snapshot.players).toEqual([
      { id: 'alice', displayName: 'Alice' },
      { id: 'bob', displayName: 'Bob' },
      { id: 'carl', displayName: 'Carl' },
    ]);

    expect(snapshot.playerOrder).toHaveLength(3);
    expect(new Set(snapshot.playerOrder).size).toBe(3);

    const deck = snapshot.deck;
    const discardHidden = snapshot.discardHidden;

    expect(deck).toHaveLength(24);
    expect(discardHidden).toHaveLength(9);
    const combined = [...deck, ...discardHidden].toSorted((a, b) => a - b);
    expect(combined[0]).toBe(3);
    expect(combined.at(-1)).toBe(35);
    expect(new Set(combined).size).toBe(33);

    const chips = snapshot.chips;
    expect(chips).toEqual({ alice: 11, bob: 11, carl: 11 });

    const envelope = store.getEnvelope('session-test');

    expect(envelope?.version).toBe(payload.state_version);
    expect(envelope?.snapshot).toEqual(snapshot);
  });

  it('プレイヤー数が不正な場合は 422 と理由コードを返す', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        players: [{ id: 'solo', display_name: 'Solo Player' }],
      }),
    });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('PLAYER_COUNT_INVALID');
  });
});
