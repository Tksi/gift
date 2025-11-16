import { createSseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import { describe, expect, it, vi } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const createSnapshot = (override: Partial<GameSnapshot> = {}): GameSnapshot => {
  const base: GameSnapshot = {
    sessionId: 'session-1',
    phase: 'running',
    deck: [10, 11, 12],
    discardHidden: [3, 4, 5, 6, 7, 8, 9, 13, 14],
    playerOrder: ['p1', 'p2'],
    rngSeed: 'seed',
    players: [
      { id: 'p1', displayName: 'Player 1' },
      { id: 'p2', displayName: 'Player 2' },
    ],
    chips: { p1: 10, p2: 11 },
    hands: { p1: [], p2: [] },
    centralPot: 0,
    turnState: {
      turn: 1,
      currentPlayerId: 'p1',
      currentPlayerIndex: 0,
      cardInCenter: 15,
      awaitingAction: true,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    finalResults: null,
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

describe('createSseBroadcastGateway', () => {
  it('state.delta の publish を接続中クライアントへブロードキャストする', () => {
    const gateway = createSseBroadcastGateway();
    const send = vi.fn();

    const connection = gateway.connect({
      sessionId: 'session-1',
      send,
    });

    const snapshot = createSnapshot();
    gateway.publishStateDelta(snapshot.sessionId, snapshot, 'version-1');

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'state:version-1',
        event: 'state.delta',
      }),
    );

    connection.disconnect();
  });

  it('Last-Event-ID を指定すると該当イベント以降の履歴のみを再送する', () => {
    const gateway = createSseBroadcastGateway();
    const snapshot = createSnapshot();

    gateway.publishStateDelta(snapshot.sessionId, snapshot, 'version-1');
    gateway.publishStateDelta(snapshot.sessionId, snapshot, 'version-2');

    const send = vi.fn();

    const connection = gateway.connect({
      sessionId: snapshot.sessionId,
      lastEventId: 'state:version-1',
      send,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'state:version-2',
      }),
    );

    connection.disconnect();
  });

  it('publishEventLog は event.log を接続中クライアントへ送信する', () => {
    const gateway = createSseBroadcastGateway();
    const send = vi.fn();

    const connection = gateway.connect({
      sessionId: 'session-1',
      send,
    });

    gateway.publishEventLog('session-1', {
      id: 'turn-1-log-1',
      turn: 1,
      actor: 'p1',
      action: 'placeChip',
      timestamp: '2025-01-01T00:00:00.000Z',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'event.log',
        id: 'turn-1-log-1',
      }),
    );

    connection.disconnect();
  });

  it('publishRuleHint は rule.hint イベントを送信する', () => {
    const gateway = createSseBroadcastGateway();
    const send = vi.fn();

    const connection = gateway.connect({
      sessionId: 'session-2',
      send,
    });

    gateway.publishRuleHint('session-2', {
      stateVersion: 'version-3',
      hint: {
        text: 'カード 10 は実質 8 点です。',
        emphasis: 'info',
        turn: 2,
        generatedAt: '2025-01-01T00:00:10.000Z',
      },
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'rule.hint',
        id: 'rule-hint:version-3',
      }),
    );

    connection.disconnect();
  });
});
