import { createApp } from 'app.js';
import {
  type EventLogEntry,
  createInMemoryGameStore,
} from 'states/inMemoryGameStore.js';
import { describe, expect, it } from 'vitest';

const createTestApp = () => {
  const store = createInMemoryGameStore();
  const app = createApp({ store });

  return { app, store };
};

type LogsJsonExportResponse = {
  session_id: string;
  event_log: EventLogEntry[];
};

const seedSession = (store: ReturnType<typeof createInMemoryGameStore>) => {
  const snapshot = {
    sessionId: 'session-log',
    phase: 'completed' as const,
    deck: [],
    discardHidden: [],
    playerOrder: ['alice'],
    rngSeed: 'seed',
    players: [{ id: 'alice', displayName: 'Alice' }],
    chips: { alice: 5 },
    hands: { alice: [3, 4, 5] },
    centralPot: 0,
    turnState: {
      turn: 5,
      currentPlayerId: 'alice',
      currentPlayerIndex: 0,
      cardInCenter: null,
      awaitingAction: false,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:10:00.000Z',
    finalResults: null,
  };
  store.saveSnapshot(snapshot);
  store.appendEventLog(snapshot.sessionId, [
    {
      id: 'turn-1-log-1',
      turn: 1,
      actor: 'alice',
      action: 'placeChip',
      timestamp: '2025-01-01T00:00:05.000Z',
      chipsDelta: -1,
    },
    {
      id: 'turn-1-log-2',
      turn: 1,
      actor: 'bob',
      action: 'takeCard',
      timestamp: '2025-01-01T00:00:10.000Z',
      details: { card: 10 },
    },
  ]);
};

describe('ログエクスポート API', () => {
  it('CSV エクスポートでヘッダ付きの文字列を返し添付ファイル扱いにする', async () => {
    const { app, store } = createTestApp();
    seedSession(store);

    const response = await app.request('/sessions/session-log/logs/export.csv');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('.csv');
    const body = await response.text();
    expect(body).toContain('turn,actor,action,timestamp');
    expect(body).toContain('turn-1-log-1');
  });

  it('JSON エクスポートで eventLog を配列として返す', async () => {
    const { app, store } = createTestApp();
    seedSession(store);

    const response = await app.request(
      '/sessions/session-log/logs/export.json',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const payload = (await response.json()) as LogsJsonExportResponse;
    expect(Array.isArray(payload.event_log)).toBe(true);
    expect(payload.event_log).toHaveLength(2);
  });

  it('存在しないセッションは 404 を返す', async () => {
    const { app } = createTestApp();
    const response = await app.request('/sessions/unknown/logs/export.csv');
    expect(response.status).toBe(404);
  });
});
