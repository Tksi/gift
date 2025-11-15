import { calculateScoreSummary } from 'services/scoreService.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const createSnapshot = (
  overrides: Partial<GameSnapshot> = {},
): GameSnapshot => {
  const base: GameSnapshot = {
    sessionId: 'session-score',
    phase: 'running',
    deck: [],
    discardHidden: [],
    playerOrder: ['alice', 'bob', 'carl'],
    rngSeed: 'seed',
    players: [
      { id: 'alice', displayName: 'Alice' },
      { id: 'bob', displayName: 'Bob' },
      { id: 'carl', displayName: 'Carl' },
    ],
    chips: { alice: 5, bob: 4, carl: 8 },
    hands: {
      alice: [3, 4, 7],
      bob: [9, 10, 11],
      carl: [],
    },
    centralPot: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    turnState: {
      turn: 10,
      currentPlayerId: 'alice',
      currentPlayerIndex: 0,
      cardInCenter: null,
      awaitingAction: false,
    },
    finalResults: null,
  };

  return {
    ...base,
    ...overrides,
    hands: {
      ...base.hands,
      ...overrides.hands,
    },
    chips: {
      ...base.chips,
      ...overrides.chips,
    },
    players: overrides.players ?? base.players,
    turnState: {
      ...base.turnState,
      ...overrides.turnState,
    },
    finalResults: overrides.finalResults ?? base.finalResults,
  };
};

describe('calculateScoreSummary', () => {
  it('連番セットの最小値のみを合算し順位を付与する', () => {
    const snapshot = createSnapshot();

    const summary = calculateScoreSummary(snapshot);

    expect(summary.placements).toEqual([
      {
        rank: 1,
        playerId: 'carl',
        score: -8,
        chipsRemaining: 8,
        cards: [],
        cardSets: [],
      },
      {
        rank: 2,
        playerId: 'alice',
        score: 5,
        chipsRemaining: 5,
        cards: [3, 4, 7],
        cardSets: [[3, 4], [7]],
      },
      {
        rank: 3,
        playerId: 'bob',
        score: 5,
        chipsRemaining: 4,
        cards: [9, 10, 11],
        cardSets: [[9, 10, 11]],
      },
    ]);
    expect(summary.tieBreak).toEqual({
      reason: 'chipCount',
      tiedScore: 5,
      contenders: ['alice', 'bob'],
      winner: 'alice',
    });
  });

  it('最終スコアが同点の場合は余剰チップの多いプレイヤーを勝者にする', () => {
    const snapshot = createSnapshot({
      hands: {
        alice: [5, 6],
        bob: [8, 9, 10],
        carl: [30],
      },
      chips: {
        alice: 3,
        bob: 6,
        carl: 0,
      },
    });

    const summary = calculateScoreSummary(snapshot);

    expect(summary.placements.map((item) => item.playerId)).toEqual([
      'bob',
      'alice',
      'carl',
    ]);
    expect(summary.placements[0]).toMatchObject({
      playerId: 'bob',
      score: 8 - 6,
      chipsRemaining: 6,
    });
    expect(summary.placements[1]).toMatchObject({
      playerId: 'alice',
      score: 5 - 3,
    });
    expect(summary.tieBreak).toEqual({
      reason: 'chipCount',
      tiedScore: 2,
      contenders: ['alice', 'bob'],
      winner: 'bob',
    });
  });
});
