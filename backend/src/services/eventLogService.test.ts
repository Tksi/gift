import { createEventLogService } from 'services/eventLogService.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it, vi } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const createSnapshot = (override: Partial<GameSnapshot> = {}): GameSnapshot => {
  const base: GameSnapshot = {
    sessionId: 'session-log',
    phase: 'running',
    deck: [],
    discardHidden: [],
    playerOrder: ['p1', 'p2'],
    rngSeed: 'seed',
    players: [
      { id: 'p1', displayName: 'Player 1' },
      { id: 'p2', displayName: 'Player 2' },
    ],
    chips: { p1: 11, p2: 11 },
    hands: { p1: [], p2: [] },
    centralPot: 0,
    turnState: {
      turn: 3,
      currentPlayerId: 'p1',
      currentPlayerIndex: 0,
      cardInCenter: 17,
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

const createGatewayStub = () => {
  const publishEventLog = vi.fn();
  const publishStateDelta = vi.fn();
  const publishStateFinal = vi.fn();
  const publishSystemError = vi.fn();
  const connect = vi.fn(() => ({ disconnect: vi.fn() }));

  return {
    connect,
    publishEventLog,
    publishStateDelta,
    publishStateFinal,
    publishSystemError,
  };
};

const setupService = () => {
  const store = createInMemoryGameStore();
  const gateway = createGatewayStub();
  const service = createEventLogService({ store, sseGateway: gateway });
  const snapshot = createSnapshot();
  store.saveSnapshot(snapshot);

  return { service, gateway, store, snapshot };
};

describe('createEventLogService', () => {
  it('アクションログを保存して event.log SSE を送信する', () => {
    const { service, gateway, store, snapshot } = setupService();

    const entry = service.recordAction({
      sessionId: snapshot.sessionId,
      turn: 3,
      actor: 'p1',
      targetPlayer: 'p1',
      action: 'placeChip',
      card: 17,
      centralPotBefore: 2,
      centralPotAfter: 3,
      chipsBefore: 10,
      chipsAfter: 9,
      timestamp: '2025-01-01T00:00:05.000Z',
    });

    expect(entry.id).toBe('turn-3-log-1');
    expect(entry.chipsDelta).toBe(-1);
    expect(entry.details).toEqual({
      card: 17,
      centralPotBefore: 2,
      centralPotAfter: 3,
      targetPlayer: 'p1',
    });
    expect(gateway.publishEventLog).toHaveBeenCalledWith(
      snapshot.sessionId,
      entry,
    );
    const stored = store.listEventLogAfter(snapshot.sessionId);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject(entry);
  });

  it('同じターン内のログ ID を連番で生成する', () => {
    const { service, snapshot } = setupService();

    const first = service.recordAction({
      sessionId: snapshot.sessionId,
      turn: 3,
      actor: 'p1',
      targetPlayer: 'p1',
      action: 'placeChip',
      card: 17,
      centralPotBefore: 0,
      centralPotAfter: 1,
      chipsBefore: 11,
      chipsAfter: 10,
      timestamp: '2025-01-01T00:00:05.000Z',
    });

    const second = service.recordAction({
      sessionId: snapshot.sessionId,
      turn: 3,
      actor: 'p2',
      targetPlayer: 'p2',
      action: 'placeChip',
      card: 17,
      centralPotBefore: 1,
      centralPotAfter: 2,
      chipsBefore: 11,
      chipsAfter: 10,
      timestamp: '2025-01-01T00:00:06.000Z',
    });

    expect(first.id).toBe('turn-3-log-1');
    expect(second.id).toBe('turn-3-log-2');
  });

  it('replayEntries は指定した ID より後のログのみを送信する', async () => {
    const { service, snapshot } = setupService();

    const first = service.recordAction({
      sessionId: snapshot.sessionId,
      turn: 3,
      actor: 'p1',
      targetPlayer: 'p1',
      action: 'placeChip',
      card: 17,
      centralPotBefore: 0,
      centralPotAfter: 1,
      chipsBefore: 11,
      chipsAfter: 10,
      timestamp: '2025-01-01T00:00:05.000Z',
    });

    service.recordAction({
      sessionId: snapshot.sessionId,
      turn: 3,
      actor: 'p2',
      targetPlayer: 'p2',
      action: 'placeChip',
      card: 17,
      centralPotBefore: 1,
      centralPotAfter: 2,
      chipsBefore: 11,
      chipsAfter: 10,
      timestamp: '2025-01-01T00:00:06.000Z',
    });

    const send = vi.fn();
    await service.replayEntries({
      sessionId: snapshot.sessionId,
      lastEventId: first.id,
      send,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'turn-3-log-2' }),
    );
  });

  it('isEventLogId でプレフィックスを判定する', () => {
    const { service } = setupService();
    expect(service.isEventLogId('turn-1-log-1')).toBe(true);
    expect(service.isEventLogId('state:abc')).toBe(false);
    expect(service.isEventLogId(null)).toBe(false);
  });
});
