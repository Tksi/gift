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
    maxPlayers: 3,
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
  it('チップからカード合計を引いた値でスコアを算出し順位を付与する', () => {
    const snapshot = createSnapshot();

    const summary = calculateScoreSummary(snapshot);

    // alice: 5 - (3+4+7) = 5 - 14 = -9
    // bob: 4 - (9+10+11) = 4 - 30 = -26
    // carl: 8 - 0 = 8
    expect(summary.placements).toEqual([
      {
        rank: 1,
        playerId: 'carl',
        score: 8,
        chipsRemaining: 8,
        cards: [],
        cardSets: [],
      },
      {
        rank: 2,
        playerId: 'alice',
        score: -9,
        chipsRemaining: 5,
        cards: [3, 4, 7],
        cardSets: [[3, 4], [7]],
      },
      {
        rank: 3,
        playerId: 'bob',
        score: -26,
        chipsRemaining: 4,
        cards: [9, 10, 11],
        cardSets: [[9, 10, 11]],
      },
    ]);
    expect(summary.tieBreak).toBeNull();
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

    // alice: 3 - (5+6) = 3 - 11 = -8
    // bob: 6 - (8+9+10) = 6 - 27 = -21
    // carl: 0 - 30 = -30
    expect(summary.placements.map((item) => item.playerId)).toEqual([
      'alice',
      'bob',
      'carl',
    ]);
    expect(summary.placements[0]).toMatchObject({
      playerId: 'alice',
      score: 3 - 11,
      chipsRemaining: 3,
    });
    expect(summary.placements[1]).toMatchObject({
      playerId: 'bob',
      score: 6 - 27,
    });
    expect(summary.tieBreak).toBeNull();
  });

  it('複数の連番グループを正しく判定する', () => {
    const snapshot = createSnapshot({
      hands: {
        alice: [3, 4, 5, 10, 11, 20],
        bob: [6],
        carl: [],
      },
      chips: {
        alice: 2,
        bob: 3,
        carl: 10,
      },
    });

    const summary = calculateScoreSummary(snapshot);
    const alicePlacement = summary.placements.find(
      (placement) => placement.playerId === 'alice',
    );

    expect(alicePlacement?.cardSets).toEqual([[3, 4, 5], [10, 11], [20]]);
    // alice: 2 - (3+4+5+10+11+20) = 2 - 53 = -51
    expect(alicePlacement?.score).toBe(2 - (3 + 4 + 5 + 10 + 11 + 20));
  });

  it('同点かつチップ数も同じ場合は winner が null になる', () => {
    const snapshot = createSnapshot({
      hands: {
        alice: [10],
        bob: [7, 8, 9],
        carl: [],
      },
      chips: {
        alice: 0,
        bob: 0,
        carl: 0,
      },
    });

    const summary = calculateScoreSummary(snapshot);
    const scores = summary.placements.map((item) => ({
      id: item.playerId,
      score: item.score,
    }));

    // alice: 0 - 10 = -10
    // bob: 0 - (7+8+9) = -24
    // carl: 0 - 0 = 0
    expect(scores).toEqual([
      { id: 'carl', score: 0 },
      { id: 'alice', score: -10 },
      { id: 'bob', score: -24 },
    ]);
    expect(summary.tieBreak).toBeNull();
  });

  it('3人以上が同点でチップも同数の場合は winner が null になる', () => {
    const snapshot = createSnapshot({
      hands: {
        alice: [10],
        bob: [10],
        carl: [10],
      },
      chips: {
        alice: 5,
        bob: 5,
        carl: 5,
      },
    });

    const summary = calculateScoreSummary(snapshot);

    // 全員: 5 - 10 = -5
    expect(summary.placements.map((item) => item.score)).toEqual([-5, -5, -5]);
    expect(summary.tieBreak?.tiedScore).toBe(-5);
    expect(summary.tieBreak?.contenders).toEqual(['alice', 'bob', 'carl']);
    expect(summary.tieBreak?.winner).toBeNull();
  });

  it('全員異なるスコアの場合は tieBreak が null になる', () => {
    const snapshot = createSnapshot({
      hands: {
        alice: [5],
        bob: [10],
        carl: [20],
      },
      chips: {
        alice: 0,
        bob: 0,
        carl: 0,
      },
    });

    const summary = calculateScoreSummary(snapshot);

    // alice: 0 - 5 = -5
    // bob: 0 - 10 = -10
    // carl: 0 - 20 = -20
    // 降順ソート: alice > bob > carl
    expect(summary.placements.map((item) => item.score)).toEqual([
      -5, -10, -20,
    ]);
    expect(summary.tieBreak).toBeNull();
  });
});
