import { randomUUID } from 'node:crypto';
import { createApp } from 'app.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

/**
 * テスト用アプリケーションを生成する。
 */
const createTestApp = () => {
  const store = createInMemoryGameStore();

  const app = createApp({
    store,
    now: () => new Date().toISOString(),
    generateSessionId: () => randomUUID(),
  });

  return { app, store };
};

type SessionResponse = {
  session_id: string;
  state_version: string;
  state: GameSnapshot;
};

type SessionsListResponse = {
  sessions: {
    sessionId: string;
    playerCount: number;
    maxPlayers: number;
    phase: string;
    createdAt: string;
  }[];
};

describe('GET /sessions', () => {
  describe('正常系', () => {
    it('セッション一覧を取得できる', async () => {
      const { app } = createTestApp();

      // セッション作成
      const createResponse = await app.request('/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ max_players: 3 }),
      });
      expect(createResponse.status).toBe(201);
      const createPayload = (await createResponse.json()) as SessionResponse;

      // 一覧取得
      const response = await app.request('/sessions', {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as SessionsListResponse;

      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0]?.sessionId).toBe(createPayload.session_id);
      expect(data.sessions[0]?.playerCount).toBe(0);
      expect(data.sessions[0]?.maxPlayers).toBe(3);
      expect(data.sessions[0]?.phase).toBe('waiting');
    });

    it('複数セッションがある場合、全て取得できる', async () => {
      const { app } = createTestApp();

      // 2つのセッション作成
      const res1 = await app.request('/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ max_players: 2 }),
      });
      expect(res1.status).toBe(201);

      const res2 = await app.request('/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ max_players: 4 }),
      });
      expect(res2.status).toBe(201);

      // 一覧取得
      const response = await app.request('/sessions', {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as SessionsListResponse;

      expect(data.sessions).toHaveLength(2);
    });

    it('セッションがない場合は空配列を返す', async () => {
      const { app } = createTestApp();

      const response = await app.request('/sessions', {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as SessionsListResponse;

      expect(data.sessions).toEqual([]);
    });
  });
});
