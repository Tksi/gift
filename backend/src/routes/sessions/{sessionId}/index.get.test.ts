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
    now: () => '2025-01-01T00:00:00.000Z',
    generateSessionId: () => 'session-test',
  });

  return { app, store };
};

type SessionResponse = {
  session_id: string;
  state_version: string;
  state: GameSnapshot;
};

type ErrorResponse = {
  error: {
    code: string;
    reason_code: string;
    instruction: string;
  };
};

describe('GET /sessions/{sessionId}', () => {
  it('ID で取得すると保存済みセッションを返す', async () => {
    const { app } = createTestApp();

    // セッション作成
    const createResponse = await app.request('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ max_players: 2 }),
    });
    const createPayload = (await createResponse.json()) as SessionResponse;
    const sessionId = createPayload.session_id;

    // プレイヤー参加
    for (const player of [
      { id: 'alice', display_name: 'Alice' },
      { id: 'bob', display_name: 'Bob' },
    ]) {
      await app.request(`/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          display_name: player.display_name,
        }),
      });
    }

    // ゲーム開始
    const startResponse = await app.request(`/sessions/${sessionId}/start`, {
      method: 'POST',
    });
    const created = (await startResponse.json()) as SessionResponse;

    const fetchResponse = await app.request(`/sessions/${created.session_id}`);

    expect(fetchResponse.status).toBe(200);
    const payload = (await fetchResponse.json()) as SessionResponse;
    expect(payload.session_id).toBe(created.session_id);
  });

  it('存在しないセッションには 404 を返す', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions/missing-session');
    expect(response.status).toBe(404);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_FOUND');
    expect(payload.error.reason_code).toBe('RESOURCE_NOT_FOUND');
    expect(payload.error.instruction).toBe(
      'Verify the identifier or create a new session.',
    );
  });
});
