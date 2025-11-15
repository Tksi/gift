import {
  collectCentralPotForPlayer,
  ensureChipActionAllowed,
  placeChipIntoCenter,
} from 'services/chipLedger.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

type SnapshotOverride = Partial<Pick<GameSnapshot, 'centralPot' | 'chips'>>;

const createSnapshot = (override: SnapshotOverride = {}): GameSnapshot => ({
  sessionId: 'session-1',
  phase: 'running',
  deck: [5, 6, 7],
  discardHidden: [10, 11, 12, 13, 14, 15, 16, 17, 18],
  playerOrder: ['alice', 'bob'],
  rngSeed: 'seed',
  players: [
    { id: 'alice', displayName: 'Alice' },
    { id: 'bob', displayName: 'Bob' },
  ],
  chips: override.chips ?? { alice: 11, bob: 11 },
  hands: { alice: [], bob: [] },
  centralPot: override.centralPot ?? 0,
  turnState: {
    turn: 1,
    currentPlayerId: 'alice',
    currentPlayerIndex: 0,
    cardInCenter: 20,
    awaitingAction: true,
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  finalResults: null,
});

describe('ChipLedger の挙動', () => {
  it('placeChipIntoCenter でチップを1枚ポットへ移し通知を返す', () => {
    const snapshot = createSnapshot();

    const notification = placeChipIntoCenter(snapshot, 'alice');

    expect(snapshot.chips.alice).toBe(10);
    expect(snapshot.centralPot).toBe(1);
    expect(notification).toEqual({
      type: 'chip.place',
      playerId: 'alice',
      chipsDelta: -1,
      resultingChips: 10,
      centralPot: 1,
    });
  });

  it('チップが0枚のプレイヤーはplaceChipを選択できない', () => {
    const snapshot = createSnapshot({ chips: { alice: 0, bob: 11 } });

    expect(() =>
      ensureChipActionAllowed(snapshot, 'alice', 'placeChip'),
    ).toThrowError('Player does not have enough chips.');

    try {
      ensureChipActionAllowed(snapshot, 'alice', 'placeChip');
    } catch (err) {
      expect(err).toMatchObject({
        code: 'CHIP_INSUFFICIENT',
        status: 422,
      });
    }

    expect(() =>
      ensureChipActionAllowed(snapshot, 'alice', 'takeCard'),
    ).not.toThrow();
  });

  it('中央ポットのチップを取得すると残量に加算され通知を返す', () => {
    const snapshot = createSnapshot({
      chips: { alice: 3, bob: 11 },
      centralPot: 4,
    });

    const notification = collectCentralPotForPlayer(snapshot, 'alice');

    expect(snapshot.chips.alice).toBe(7);
    expect(snapshot.centralPot).toBe(0);
    expect(notification).toEqual({
      type: 'chip.collect',
      playerId: 'alice',
      chipsDelta: 4,
      resultingChips: 7,
      centralPot: 0,
    });
  });

  it('中央ポットが0枚ならcollectCentralPotForPlayerはnullを返す', () => {
    const snapshot = createSnapshot({ centralPot: 0 });

    const notification = collectCentralPotForPlayer(snapshot, 'alice');

    expect(notification).toBeNull();
    expect(snapshot.chips.alice).toBe(11);
  });
});
