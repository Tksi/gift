import { createHash } from 'node:crypto';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

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
  turnState: {
    turn: 1,
    currentPlayerId: 'alice',
    currentPlayerIndex: 0,
    cardInCenter: 10,
    awaitingAction: true,
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt,
  finalResults: null,
  maxPlayers: 2,
});

describe('createInMemoryGameStore の挙動', () => {
  it('スナップショットを保存し sha1 のバージョンを返す', () => {
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

  it('取得したオブジェクトを書き換えても保存済みスナップショットは変化しない', () => {
    const store = createInMemoryGameStore();
    const snapshot = makeSnapshot();
    store.saveSnapshot(snapshot);

    const retrieved = store.getSnapshot(snapshot.sessionId);
    retrieved?.deck.push(99);

    const fresh = store.getSnapshot(snapshot.sessionId);
    expect(fresh?.deck).toEqual([10, 11, 12]);
  });

  it('冪等性チェック用に処理済みコマンドを記録する', () => {
    const store = createInMemoryGameStore();
    const snapshot = makeSnapshot();
    store.saveSnapshot(snapshot);

    expect(store.hasProcessedCommand(snapshot.sessionId, 'cmd-1')).toBe(false);
    store.markCommandProcessed(snapshot.sessionId, 'cmd-1');
    expect(store.hasProcessedCommand(snapshot.sessionId, 'cmd-1')).toBe(true);
  });

  it('フェーズが completed になってもセッション履歴を保持する', () => {
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

  describe('pruneSessionsOlderThan', () => {
    it('指定日時より古いセッションを削除する', () => {
      const store = createInMemoryGameStore();

      // 2日前のセッション
      const oldSession = makeSnapshot({
        sessionId: 'old-session',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });
      // 現在のセッション
      const newSession = makeSnapshot({
        sessionId: 'new-session',
        updatedAt: '2025-01-03T00:00:00.000Z',
      });

      store.saveSnapshot(oldSession);
      store.saveSnapshot(newSession);

      // 1月2日を閾値とする（1月1日のセッションは削除される）
      const threshold = new Date('2025-01-02T00:00:00.000Z');
      const pruned = store.pruneSessionsOlderThan(threshold);

      expect(pruned).toEqual(['old-session']);
      expect(store.getSnapshot('old-session')).toBeUndefined();
      expect(store.getSnapshot('new-session')).toBeDefined();
    });

    it('削除対象がない場合は空配列を返す', () => {
      const store = createInMemoryGameStore();

      const recentSession = makeSnapshot({
        sessionId: 'recent-session',
        updatedAt: '2025-01-03T00:00:00.000Z',
      });
      store.saveSnapshot(recentSession);

      const threshold = new Date('2025-01-02T00:00:00.000Z');
      const pruned = store.pruneSessionsOlderThan(threshold);

      expect(pruned).toEqual([]);
      expect(store.getSnapshot('recent-session')).toBeDefined();
    });

    it('セッションがない場合は空配列を返す', () => {
      const store = createInMemoryGameStore();

      const threshold = new Date('2025-01-02T00:00:00.000Z');
      const pruned = store.pruneSessionsOlderThan(threshold);

      expect(pruned).toEqual([]);
    });

    it('削除時にlistSessionsからも消える', () => {
      const store = createInMemoryGameStore();

      store.saveSnapshot(
        makeSnapshot({
          sessionId: 'session-a',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
      );
      store.saveSnapshot(
        makeSnapshot({
          sessionId: 'session-b',
          updatedAt: '2025-01-03T00:00:00.000Z',
        }),
      );

      expect(store.listSessions()).toHaveLength(2);

      const threshold = new Date('2025-01-02T00:00:00.000Z');
      store.pruneSessionsOlderThan(threshold);

      const sessions = store.listSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.sessionId).toBe('session-b');
    });
  });
});
