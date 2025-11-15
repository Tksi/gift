import { createTurnDecisionService } from 'services/turnDecision.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

type SnapshotOverride = Partial<
  Omit<GameSnapshot, 'chips' | 'hands' | 'turnState'>
> & {
  chips?: GameSnapshot['chips'];
  hands?: GameSnapshot['hands'];
  turnState?: GameSnapshot['turnState'];
};

const createSnapshot = (override: SnapshotOverride = {}): GameSnapshot => {
  const base: GameSnapshot = {
    sessionId: 'session-1',
    phase: 'running',
    deck: [15, 16, 17, 18],
    discardHidden: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    playerOrder: ['alice', 'bob'],
    rngSeed: 'seed',
    players: [
      { id: 'alice', displayName: 'Alice' },
      { id: 'bob', displayName: 'Bob' },
    ],
    chips: { alice: 11, bob: 11 },
    hands: { alice: [], bob: [] },
    centralPot: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    turnState: {
      turn: 1,
      currentPlayerId: 'alice',
      currentPlayerIndex: 0,
      cardInCenter: 12,
      awaitingAction: true,
    },
  };

  return {
    ...base,
    ...override,
    deck: override.deck ?? base.deck,
    discardHidden: override.discardHidden ?? base.discardHidden,
    playerOrder: override.playerOrder ?? base.playerOrder,
    players: override.players ?? base.players,
    chips: override.chips ?? base.chips,
    hands: override.hands ?? base.hands,
    turnState: override.turnState ?? base.turnState,
  };
};

const setupService = (options: { snapshot?: SnapshotOverride } = {}) => {
  const store = createInMemoryGameStore();
  const snapshot = createSnapshot(options.snapshot);
  const envelope = store.saveSnapshot(snapshot);
  const service = createTurnDecisionService({
    store,
    now: () => '2025-01-01T00:00:10.000Z',
  });

  return { service, store, snapshot, envelope };
};

describe('createTurnDecisionService の挙動', () => {
  it('stateVersion が一致しない場合は 409 エラーを投げる', async () => {
    const { service, snapshot } = setupService();

    await expect(
      service.applyCommand({
        sessionId: snapshot.sessionId,
        commandId: 'cmd-1',
        expectedVersion: 'mismatch-version',
        playerId: 'alice',
        action: 'placeChip',
      }),
    ).rejects.toMatchObject({
      code: 'STATE_VERSION_MISMATCH',
      status: 409,
    });
  });

  it('placeChip で中央ポットを増やし次のプレイヤーへ手番を進める', async () => {
    const { service, envelope } = setupService();
    const { version } = envelope;

    const result = await service.applyCommand({
      sessionId: envelope.snapshot.sessionId,
      commandId: 'cmd-1',
      expectedVersion: version,
      playerId: 'alice',
      action: 'placeChip',
    });

    expect(result.snapshot.centralPot).toBe(1);
    expect(result.snapshot.chips.alice).toBe(10);
    expect(result.snapshot.turnState.currentPlayerId).toBe('bob');
    expect(result.snapshot.turnState.currentPlayerIndex).toBe(1);
    expect(result.snapshot.turnState.turn).toBe(1);
    expect(result.snapshot.updatedAt).toBe('2025-01-01T00:00:10.000Z');
  });

  it('takeCard でカードとチップを取得し新しいターンを開始する', async () => {
    const { service, envelope } = setupService({
      snapshot: {
        centralPot: 3,
        chips: { alice: 9, bob: 13 },
        turnState: {
          turn: 4,
          currentPlayerId: 'alice',
          currentPlayerIndex: 0,
          cardInCenter: 20,
          awaitingAction: true,
        },
        deck: [21, 22],
        hands: { alice: [5], bob: [] },
      },
    });

    const result = await service.applyCommand({
      sessionId: envelope.snapshot.sessionId,
      commandId: 'cmd-2',
      expectedVersion: envelope.version,
      playerId: 'alice',
      action: 'takeCard',
    });

    expect(result.snapshot.hands.alice).toEqual([5, 20]);
    expect(result.snapshot.centralPot).toBe(0);
    expect(result.snapshot.deck).toEqual([22]);
    expect(result.snapshot.turnState.cardInCenter).toBe(21);
    expect(result.snapshot.turnState.turn).toBe(5);
    expect(result.snapshot.turnState.currentPlayerId).toBe('alice');
    expect(result.snapshot.chips.alice).toBe(12);
  });

  it('同じ commandId を再送すると最新状態をそのまま返す', async () => {
    const { service, envelope } = setupService();
    const input = {
      sessionId: envelope.snapshot.sessionId,
      commandId: 'cmd-repeat',
      expectedVersion: envelope.version,
      playerId: 'alice',
      action: 'placeChip' as const,
    };

    const first = await service.applyCommand(input);
    const second = await service.applyCommand(input);

    expect(second.snapshot.centralPot).toBe(first.snapshot.centralPot);
    expect(second.version).toBe(first.version);
  });

  it('手番ではないプレイヤーのアクションは拒否する', async () => {
    const { service, envelope } = setupService();

    await expect(
      service.applyCommand({
        sessionId: envelope.snapshot.sessionId,
        commandId: 'cmd-3',
        expectedVersion: envelope.version,
        playerId: 'bob',
        action: 'placeChip',
      }),
    ).rejects.toMatchObject({
      code: 'TURN_NOT_AVAILABLE',
      status: 422,
    });
  });
});
