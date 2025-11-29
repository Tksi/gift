import { createSseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import { describe, expect, it, vi } from 'vitest';
import type { SseEventPayload } from 'services/sseBroadcastGateway.js';
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
    maxPlayers: 2,
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
    const send = vi.fn<(event: SseEventPayload) => void>();

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

    const send = vi.fn<(event: SseEventPayload) => void>();

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

  it('publishSystemError は reason_code と instruction を含む system.error を配信する', () => {
    const gateway = createSseBroadcastGateway();
    const send = vi.fn<(event: SseEventPayload) => void>();

    const connection = gateway.connect({
      sessionId: 'session-error',
      send,
    });

    gateway.publishSystemError('session-error', {
      code: 'STATE_VERSION_MISMATCH',
      message: 'State mismatch.',
      reason_code: 'STATE_CONFLICT',
      instruction: 'Fetch the latest state and resend the command.',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'system.error',
      }),
    );

    const firstCall = send.mock.calls[0];

    if (!firstCall) {
      throw new Error('system.error event was not emitted');
    }

    const [event] = firstCall;

    const payload = JSON.parse(event.data) as {
      error: {
        reason_code: string;
        instruction: string;
      };
    };

    expect(payload.error.reason_code).toBe('STATE_CONFLICT');
    expect(payload.error.instruction).toBe(
      'Fetch the latest state and resend the command.',
    );

    connection.disconnect();
  });
});
