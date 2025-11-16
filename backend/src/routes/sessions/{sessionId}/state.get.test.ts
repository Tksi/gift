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

describe('GET /sessions/{sessionId}/state', () => {
  it('最新スナップショットを返し ETag をヘッダーへ付与する', async () => {
    const { app } = createTestApp();

    const createResponse = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        players: [
          { id: 'alice', display_name: 'Alice' },
          { id: 'bob', display_name: 'Bob' },
        ],
      }),
    });

    const created = (await createResponse.json()) as SessionResponse;
    const expectedEtag = `"${created.state_version}"`;

    const response = await app.request(`/sessions/${created.session_id}/state`);

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe(expectedEtag);

    const payload = (await response.json()) as SessionResponse;
    expect(payload.session_id).toBe(created.session_id);
    expect(payload.state_version).toBe(created.state_version);
  });

  it('ETag が一致する場合は 304 を返す', async () => {
    const { app } = createTestApp();

    const createResponse = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        players: [
          { id: 'alice', display_name: 'Alice' },
          { id: 'bob', display_name: 'Bob' },
        ],
      }),
    });

    const created = (await createResponse.json()) as SessionResponse;
    const expectedEtag = `"${created.state_version}"`;

    const response = await app.request(
      `/sessions/${created.session_id}/state`,
      {
        headers: {
          'if-none-match': expectedEtag,
        },
      },
    );

    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe(expectedEtag);
    expect(await response.text()).toBe('');
  });

  it('存在しないセッションを指定すると 404 を返す', async () => {
    const { app } = createTestApp();

    const response = await app.request('/sessions/missing/state');
    expect(response.status).toBe(404);

    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_FOUND');
    expect(payload.error.reason_code).toBe('RESOURCE_NOT_FOUND');
    expect(payload.error.instruction).toBe(
      'Verify the identifier or create a new session.',
    );
  });
});
