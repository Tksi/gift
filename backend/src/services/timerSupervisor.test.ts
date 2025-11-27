import { createTimerSupervisor } from 'services/timerSupervisor.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it, vi } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const createSnapshot = (
  overrides: Partial<GameSnapshot> = {},
): GameSnapshot => {
  const base: GameSnapshot = {
    sessionId: 'session-timer',
    phase: 'running',
    deck: [],
    discardHidden: [],
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
      deadline: '2025-01-01T00:00:05.000Z',
    },
    finalResults: null,
    maxPlayers: 2,
  };

  return {
    ...base,
    ...overrides,
    turnState: {
      ...base.turnState,
      ...overrides.turnState,
    },
  };
};

const fixedNow = () => Date.parse('2025-01-01T00:00:00.000Z');

const createDependencies = () => {
  const schedule = vi.fn(
    (callback: () => void, delay: number): NodeJS.Timeout => {
      const handle = {
        id: Symbol('timer'),
        callback,
        delay,
      } as unknown as NodeJS.Timeout;

      return handle;
    },
  );
  const cancel = vi.fn((handle: NodeJS.Timeout) => handle);
  const onTimeout = vi.fn();

  return { now: fixedNow, schedule, cancel, onTimeout };
};

describe('TimerSupervisor', () => {
  it('register で締切をスケジュールし envelope にハンドルを保持する', () => {
    const store = createInMemoryGameStore();
    const snapshot = createSnapshot();
    store.saveSnapshot(snapshot);

    const deps = createDependencies();
    let scheduledCallback: (() => void) | undefined;
    deps.schedule.mockImplementation((callback: () => void, delay: number) => {
      scheduledCallback = callback;
      const handle = { delay } as unknown as NodeJS.Timeout;

      return handle;
    });

    const supervisor = createTimerSupervisor({
      store,
      now: deps.now,
      schedule: deps.schedule,
      cancel: deps.cancel,
      onTimeout: deps.onTimeout,
    });

    supervisor.register(snapshot.sessionId, snapshot.turnState.deadline);

    expect(deps.schedule).toHaveBeenCalledTimes(1);
    const [scheduledDelay] = deps.schedule.mock.calls[0]?.slice(1) ?? [];
    expect(scheduledDelay).toBe(5000);

    const envelope = store.getEnvelope(snapshot.sessionId);
    expect(envelope?.deadlineHandle).toBeDefined();
    expect(envelope?.deadlineAt).toBe(Date.parse('2025-01-01T00:00:05.000Z'));

    scheduledCallback?.();
    expect(deps.onTimeout).toHaveBeenCalledWith(snapshot.sessionId);
    expect(envelope?.deadlineHandle).toBeUndefined();
    expect(envelope?.deadlineAt).toBeUndefined();
  });

  it('register で締切が null の場合は既存タイマーを解除する', () => {
    const store = createInMemoryGameStore();
    const snapshot = createSnapshot();
    store.saveSnapshot(snapshot);

    const deps = createDependencies();
    const fakeHandle = { label: 'timer' } as unknown as NodeJS.Timeout;
    deps.schedule.mockReturnValue(fakeHandle);

    const supervisor = createTimerSupervisor({
      store,
      now: deps.now,
      schedule: deps.schedule,
      cancel: deps.cancel,
      onTimeout: deps.onTimeout,
    });

    supervisor.register(snapshot.sessionId, snapshot.turnState.deadline);
    expect(deps.schedule).toHaveBeenCalledTimes(1);

    supervisor.register(snapshot.sessionId, null);
    expect(deps.cancel).toHaveBeenCalledWith(fakeHandle);

    const envelope = store.getEnvelope(snapshot.sessionId);
    expect(envelope?.deadlineHandle).toBeUndefined();
    expect(envelope?.deadlineAt).toBeUndefined();
  });

  it('restore で未処理の締切を再登録する', () => {
    const store = createInMemoryGameStore();
    const snapshot = createSnapshot({
      turnState: {
        turn: 2,
        currentPlayerId: 'bob',
        currentPlayerIndex: 1,
        cardInCenter: 15,
        awaitingAction: true,
        deadline: '2025-01-01T00:00:02.000Z',
      },
    });
    store.saveSnapshot(snapshot);

    const deps = createDependencies();
    const supervisor = createTimerSupervisor({
      store,
      now: () => Date.parse('2025-01-01T00:00:03.000Z'),
      schedule: deps.schedule,
      cancel: deps.cancel,
      onTimeout: deps.onTimeout,
    });

    supervisor.restore();
    expect(deps.schedule).toHaveBeenCalledTimes(1);
    const [, delay] = deps.schedule.mock.calls[0] ?? [];
    expect(delay).toBe(0);
  });
});
