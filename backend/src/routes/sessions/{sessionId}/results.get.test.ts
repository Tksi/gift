import { createApp } from 'app.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it } from 'vitest';
import type { ScoreSummary } from 'services/scoreService.js';

const createTestApp = () => {
  const store = createInMemoryGameStore();
  const app = createApp({ store });

  return { app, store };
};

// 新スコア計算: チップ - 獲得カードの合計（高いほうが勝ち）
// alice: 8 - (3+4) = 1, bob: 5 - 10 = -5
const sampleResults: ScoreSummary = {
  placements: [
    {
      rank: 1,
      playerId: 'alice',
      score: 1,
      chipsRemaining: 8,
      cards: [3, 4],
      cardSets: [[3, 4]],
    },
    {
      rank: 2,
      playerId: 'bob',
      score: -5,
      chipsRemaining: 5,
      cards: [10],
      cardSets: [[10]],
    },
  ],
  tieBreak: null,
};

describe('GET /sessions/:id/results', () => {
  it('completed セッションの最終結果とイベントログを返す', async () => {
    const { app, store } = createTestApp();
    const snapshot = {
      sessionId: 'session-x',
      phase: 'completed' as const,
      deck: [],
      discardHidden: [],
      playerOrder: ['alice', 'bob'],
      rngSeed: 'seed',
      players: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
      ],
      chips: { alice: 8, bob: 5 },
      hands: { alice: [3, 4], bob: [10] },
      centralPot: 0,
      turnState: {
        turn: 20,
        currentPlayerId: 'alice',
        currentPlayerIndex: 0,
        cardInCenter: null,
        awaitingAction: false,
        deadline: null,
      },
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:10:00.000Z',
      finalResults: sampleResults,
      maxPlayers: 2,
    };
    store.saveSnapshot(snapshot);

    type ResultsResponse = {
      session_id: string;
      final_results: ScoreSummary;
    };

    const response = await app.request('/sessions/session-x/results');
    expect(response.status).toBe(200);

    const payload = (await response.json()) as ResultsResponse;
    expect(payload.session_id).toBe('session-x');
    expect(payload.final_results).toEqual(sampleResults);
  });

  it('結果が未確定のセッションには 409 を返す', async () => {
    const { app, store } = createTestApp();
    store.saveSnapshot({
      sessionId: 'session-pending',
      phase: 'running',
      deck: [10],
      discardHidden: [],
      playerOrder: [],
      rngSeed: 'seed',
      players: [],
      chips: {},
      hands: {},
      centralPot: 0,
      turnState: {
        turn: 1,
        currentPlayerId: '',
        currentPlayerIndex: 0,
        cardInCenter: null,
        awaitingAction: false,
      },
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      finalResults: null,
      maxPlayers: 2,
    });

    const response = await app.request('/sessions/session-pending/results');
    expect(response.status).toBe(409);
  });

  it('存在しないセッションは 404', async () => {
    const { app } = createTestApp();
    const response = await app.request('/sessions/missing/results');
    expect(response.status).toBe(404);
  });
});
