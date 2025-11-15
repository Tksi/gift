import { createTimeoutCommandHandler } from 'services/systemTimeoutHandler.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it, vi } from 'vitest';
import type { TurnDecisionService } from 'services/turnDecision.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const createSnapshot = (override: Partial<GameSnapshot> = {}): GameSnapshot => {
  const base: GameSnapshot = {
    sessionId: 'session-timeout',
    phase: 'running',
    deck: [10],
    discardHidden: [],
    playerOrder: ['alice'],
    rngSeed: 'seed',
    players: [{ id: 'alice', displayName: 'Alice' }],
    chips: { alice: 11 },
    hands: { alice: [] },
    centralPot: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    turnState: {
      turn: 1,
      currentPlayerId: 'alice',
      currentPlayerIndex: 0,
      cardInCenter: 12,
      awaitingAction: true,
      deadline: '2025-01-01T00:00:05.000Z',
    },
    finalResults: null,
  };

  return {
    ...base,
    ...override,
    turnState: {
      ...base.turnState,
      ...override.turnState,
    },
  };
};

const createTurnServiceStub = () => {
  const applyCommand = vi.fn(() =>
    Promise.resolve({
      snapshot: createSnapshot(),
      version: 'timeout-version',
    }),
  );
  const turnService: TurnDecisionService = {
    applyCommand,
  };

  return { turnService, applyCommand };
};

describe('createTimeoutCommandHandler', () => {
  it('待機中のターンを system takeCard で強制完了させる', async () => {
    const store = createInMemoryGameStore();
    const snapshot = createSnapshot();
    const envelope = store.saveSnapshot(snapshot);
    const { turnService, applyCommand } = createTurnServiceStub();

    const handler = createTimeoutCommandHandler({
      store,
      turnService,
      generateCommandId: () => 'system-timeout-1',
    });

    await handler(snapshot.sessionId);

    expect(applyCommand).toHaveBeenCalledWith({
      sessionId: snapshot.sessionId,
      commandId: 'system-timeout-1',
      expectedVersion: envelope.version,
      playerId: 'system',
      action: 'takeCard',
    });
  });

  it('セッションが存在しない場合は何もしない', async () => {
    const store = createInMemoryGameStore();
    const { turnService, applyCommand } = createTurnServiceStub();
    const handler = createTimeoutCommandHandler({
      store,
      turnService,
    });

    await expect(handler('missing-session')).resolves.toBeUndefined();
    expect(applyCommand).not.toHaveBeenCalled();
  });

  it('アクション待ちでない場合は強制コマンドを送らない', async () => {
    const store = createInMemoryGameStore();
    const snapshot = createSnapshot({
      turnState: {
        turn: 2,
        currentPlayerId: 'alice',
        currentPlayerIndex: 0,
        cardInCenter: null,
        awaitingAction: false,
      },
    });
    store.saveSnapshot(snapshot);

    const { turnService, applyCommand } = createTurnServiceStub();
    const handler = createTimeoutCommandHandler({
      store,
      turnService,
    });

    await handler(snapshot.sessionId);
    expect(applyCommand).not.toHaveBeenCalled();
  });

  it('最新バージョンと一致しない場合でも例外を投げず終了する', async () => {
    const store = createInMemoryGameStore();
    const snapshot = createSnapshot();
    store.saveSnapshot(snapshot);

    const { turnService, applyCommand } = createTurnServiceStub();
    applyCommand.mockRejectedValue(
      new Error('STATE_VERSION_MISMATCH for forced command'),
    );

    const handler = createTimeoutCommandHandler({
      store,
      turnService,
    });

    await expect(handler(snapshot.sessionId)).resolves.toBeUndefined();
    expect(applyCommand).toHaveBeenCalledTimes(1);
  });
});
