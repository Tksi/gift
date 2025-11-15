import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createInMemoryGameStore } from '../inMemoryGameStore.js';
import type { EventLogEntry, GameSnapshot } from '../inMemoryGameStore.js';

type SnapshotOptions = {
  sessionId?: string;
  phase?: GameSnapshot['phase'];
  updatedAt?: string;
};

const makeSnapshot = ({
  sessionId = 'session-1',
  phase = 'setup',
  updatedAt = new Date().toISOString(),
}: SnapshotOptions = {}): GameSnapshot => ({
  sessionId,
  phase,
  deck: [10, 11, 12],
  discardHidden: [20, 21, 22],
  playerOrder: ['alice', 'bob'],
  rngSeed: 'seed-value',
  players: [
    { id: 'alice', displayName: 'Alice' },
    { id: 'bob', displayName: 'Bob' },
  ],
  chips: { alice: 11, bob: 11 },
  hands: { alice: [], bob: [] },
  centralPot: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt,
});

const makeLogEntry = (
  overrides: Partial<EventLogEntry> = {},
): EventLogEntry => ({
  id: 'turn-1-log-1',
  turn: 1,
  actor: 'alice',
  action: 'placeChip',
  timestamp: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

describe('createInMemoryGameStore', () => {
  it('persists snapshots and exposes sha1 versions', () => {
    const store = createInMemoryGameStore();
    const snapshot = makeSnapshot();

    const result = store.saveSnapshot(snapshot);

    const expectedHash = createHash('sha1')
      .update(JSON.stringify(snapshot))
      .digest('hex');
    expect(result.version).toBe(expectedHash);

    const stored = store.getSnapshot(snapshot.sessionId);
    expect(stored).toEqual(snapshot);
  });

  it('does not mutate persisted snapshots when callers modify returned objects', () => {
    const store = createInMemoryGameStore();
    const snapshot = makeSnapshot();
    store.saveSnapshot(snapshot);

    const retrieved = store.getSnapshot(snapshot.sessionId);
    retrieved?.deck.push(99);

    const fresh = store.getSnapshot(snapshot.sessionId);
    expect(fresh?.deck).toEqual([10, 11, 12]);
  });

  it('allows event logs to be appended and filtered with cursor ids', () => {
    const store = createInMemoryGameStore();
    const snapshot = makeSnapshot();
    store.saveSnapshot(snapshot);

    const first = makeLogEntry();
    const second = makeLogEntry({ id: 'turn-1-log-2', action: 'takeCard' });

    store.appendEventLog(snapshot.sessionId, [first, second]);

    const allEntries = store.listEventLogAfter(snapshot.sessionId);
    expect(allEntries).toEqual([first, second]);

    const afterFirst = store.listEventLogAfter(snapshot.sessionId, first.id);
    expect(afterFirst).toEqual([second]);
  });

  it('tracks processed commands for idempotency checks', () => {
    const store = createInMemoryGameStore();
    const snapshot = makeSnapshot();
    store.saveSnapshot(snapshot);

    expect(store.hasProcessedCommand(snapshot.sessionId, 'cmd-1')).toBe(false);
    store.markCommandProcessed(snapshot.sessionId, 'cmd-1');
    expect(store.hasProcessedCommand(snapshot.sessionId, 'cmd-1')).toBe(true);
  });

  it('keeps session history even after marking the phase as completed', () => {
    const store = createInMemoryGameStore();
    const snapshot = makeSnapshot();
    store.saveSnapshot(snapshot);

    store.saveSnapshot({
      ...snapshot,
      phase: 'completed',
      updatedAt: '2025-01-02T00:00:00.000Z',
    });

    const sessions = store.listSessions();
    expect(sessions).toHaveLength(1);
    const summary = sessions[0];

    if (!summary) {
      throw new Error('Session summary should be present');
    }

    expect(summary.sessionId).toBe(snapshot.sessionId);
    expect(summary.phase).toBe('completed');
    expect(summary.updatedAt).toBe('2025-01-02T00:00:00.000Z');
    expect(typeof summary.version).toBe('string');
  });

  it('throws a helpful error when appending logs to an unknown session', () => {
    const store = createInMemoryGameStore();
    expect(() =>
      store.appendEventLog('missing-session', [makeLogEntry()]),
    ).toThrowError('Session missing-session is not initialized');
  });
});
