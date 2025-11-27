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

/**
 * ゲーム開始状態のセッションを作成するヘルパー。
 * @param app アプリケーション。
 * @param players プレイヤー情報。
 */
const createStartedSession = async (
  app: ReturnType<typeof createTestApp>['app'],
  players: { id: string; display_name: string }[],
): Promise<SessionResponse> => {
  // セッション作成
  const createResponse = await app.request('/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ max_players: players.length }),
  });
  const createPayload = (await createResponse.json()) as SessionResponse;
  const sessionId = createPayload.session_id;

  // プレイヤー参加
  for (const player of players) {
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

  return (await startResponse.json()) as SessionResponse;
};

describe('GET /sessions/{sessionId}/state', () => {
  it('最新スナップショットを返し ETag をヘッダーへ付与する', async () => {
    const { app } = createTestApp();

    const created = await createStartedSession(app, [
      { id: 'alice', display_name: 'Alice' },
      { id: 'bob', display_name: 'Bob' },
    ]);
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

    const created = await createStartedSession(app, [
      { id: 'alice', display_name: 'Alice' },
      { id: 'bob', display_name: 'Bob' },
    ]);
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
