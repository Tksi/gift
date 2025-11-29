import { createApp } from 'app.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

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

const createSseEventReader = (body: ReadableStream<Uint8Array>) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const readEvent = async (): Promise<string | null> => {
    while (true) {
      const separatorIndex = buffer.indexOf('\n\n');

      if (separatorIndex !== -1) {
        const chunk = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        return chunk;
      }

      const result = await reader.read();

      if (result.done) {
        if (buffer.length === 0) {
          return null;
        }

        const chunk = buffer;
        buffer = '';

        return chunk;
      }

      buffer += decoder.decode(result.value, { stream: true });
    }
  };

  const cancel = async () => {
    await reader.cancel();
  };

  return { readEvent, cancel };
};

type ParsedSseEvent = {
  id: string;
  event: string;
  data: string;
};

const parseSseEvent = (chunk: string): ParsedSseEvent | null => {
  const payload: ParsedSseEvent = { id: '', event: '', data: '' };
  const lines = chunk
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('id:')) {
      payload.id = line.slice(3).trim();
    } else if (line.startsWith('event:')) {
      payload.event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  payload.data = dataLines.join('\n');

  if (payload.event.length === 0 && payload.data.length === 0) {
    return null;
  }

  return payload;
};

const readNextDataEvent = async (
  reader: ReturnType<typeof createSseEventReader>,
): Promise<ParsedSseEvent | null> => {
  while (true) {
    const chunk = await reader.readEvent();

    if (chunk === null) {
      return null;
    }

    const event = parseSseEvent(chunk);

    if (event) {
      return event;
    }
  }
};

/**
 * ゲーム開始状態のセッションを作成するヘルパー。
 */
const createSession = async () => {
  const app = createApp({
    now: () => '2025-01-01T00:00:00.000Z',
    generateSessionId: () => 'session-test',
  });

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
  const session = (await startResponse.json()) as SessionResponse;

  return { app, session };
};

describe('GET /sessions/{sessionId}/stream', () => {
  it('最新状態を state.delta イベントとして送信する', async () => {
    const { app, session } = await createSession();
    const response = await app.request(
      `/sessions/${session.session_id}/stream`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const body = response.body;
    expect(body).not.toBeNull();

    if (!body) {
      return;
    }

    const reader = createSseEventReader(body);
    // join 時のイベントをスキップして setup/running フェーズの state.delta を取得
    let data: SessionResponse | null = null;

    while (true) {
      const event = await readNextDataEvent(reader);

      if (!event) {
        throw new Error('Expected state.delta event not found');
      }

      if (event.event === 'state.delta') {
        const parsed = JSON.parse(event.data) as SessionResponse;

        if (
          parsed.state.phase === 'setup' ||
          parsed.state.phase === 'running'
        ) {
          data = parsed;

          break;
        }
      }
    }

    expect(data).not.toBeNull();
    expect(data.session_id).toBe(session.session_id);
    // state_version は SSE 接続時の最新版なので存在確認のみ
    expect(data.state_version).toBeTruthy();
    await reader.cancel();
  });

  it('アクション適用後に新しい state.delta を受信できる', async () => {
    const { app, session } = await createSession();
    const response = await app.request(
      `/sessions/${session.session_id}/stream`,
    );
    const body = response.body;
    expect(body).not.toBeNull();

    if (!body) {
      return;
    }

    const reader = createSseEventReader(body);
    // join 時のイベントをスキップして setup/running フェーズの state.delta を取得
    let initialState: SessionResponse | null = null;

    while (true) {
      const event = await readNextDataEvent(reader);

      if (!event) {
        throw new Error('Expected state.delta event not found');
      }

      if (event.event === 'state.delta') {
        const data = JSON.parse(event.data) as SessionResponse;

        if (data.state.phase === 'setup' || data.state.phase === 'running') {
          initialState = data;

          break;
        }
      }
    }

    expect(initialState).not.toBeNull();
    const currentVersion = initialState.state_version;
    const actorId = initialState.state.turnState.currentPlayerId;

    const actionResponse = await app.request(
      `/sessions/${session.session_id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          command_id: 'cmd-1',
          state_version: currentVersion,
          player_id: actorId,
          action: 'placeChip',
        }),
      },
    );

    expect(actionResponse.status).toBe(200);

    const stateEvent = await readNextDataEvent(reader);

    expect(stateEvent).not.toBeNull();

    if (!stateEvent) {
      return;
    }

    expect(stateEvent.event).toBe('state.delta');
    const data = JSON.parse(stateEvent.data) as SessionResponse;
    expect(data.state_version).not.toBe(session.state_version);
    await reader.cancel();
  });

  it('存在しないセッションに対する接続は 404 を返す', async () => {
    const app = createApp();
    const response = await app.request('/sessions/missing/stream');
    expect(response.status).toBe(404);
    const payload = (await response.json()) as ErrorResponse;
    expect(payload.error.code).toBe('SESSION_NOT_FOUND');
    expect(payload.error.reason_code).toBe('RESOURCE_NOT_FOUND');
    expect(payload.error.instruction).toBe(
      'Verify the identifier or create a new session.',
    );
  });

  it('ロビー状態で player_id 付き接続を切断すると自動的にプレイヤーが削除される', async () => {
    const app = createApp({
      now: () => '2025-01-01T00:00:00.000Z',
      generateSessionId: () => 'session-disconnect-test',
    });

    // セッション作成
    const createResponse = await app.request('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ max_players: 3 }),
    });
    const createPayload = (await createResponse.json()) as SessionResponse;
    const sessionId = createPayload.session_id;

    // プレイヤー 2 人参加
    await app.request(`/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        player_id: 'alice',
        display_name: 'Alice',
      }),
    });

    await app.request(`/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        player_id: 'bob',
        display_name: 'Bob',
      }),
    });

    // alice が player_id 付きで SSE 接続
    const response = await app.request(
      `/sessions/${sessionId}/stream?player_id=alice`,
    );

    expect(response.status).toBe(200);

    const body = response.body;
    expect(body).not.toBeNull();

    if (!body) {
      return;
    }

    const reader = createSseEventReader(body);

    // 履歴からのリプレイイベントをすべて受信（alice 参加、bob 参加の 2 つ）
    let latestData: SessionResponse | null = null;

    for (let i = 0; i < 2; i++) {
      const event = await readNextDataEvent(reader);

      if (event?.event === 'state.delta') {
        latestData = JSON.parse(event.data) as SessionResponse;
      }
    }

    // 最新状態で alice と bob が参加済み
    expect(latestData).not.toBeNull();
    expect(latestData?.state.players).toHaveLength(2);

    // SSE 接続を切断
    await reader.cancel();

    // 少し待機してから状態を確認（非同期処理の完了を待つ）
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 状態を確認（alice が削除されているはず）
    const stateResponse = await app.request(`/sessions/${sessionId}/state`);
    const statePayload = (await stateResponse.json()) as SessionResponse;

    expect(statePayload.state.players).toHaveLength(1);
    expect(statePayload.state.players[0]?.id).toBe('bob');
  });

  it('ゲーム開始後の切断ではプレイヤーは削除されない', async () => {
    const { app, session } = await createSession();

    // alice が player_id 付きで SSE 接続
    const response = await app.request(
      `/sessions/${session.session_id}/stream?player_id=alice`,
    );

    expect(response.status).toBe(200);

    const body = response.body;
    expect(body).not.toBeNull();

    if (!body) {
      return;
    }

    const reader = createSseEventReader(body);

    // イベントを 1 つ受信
    await readNextDataEvent(reader);

    // SSE 接続を切断
    await reader.cancel();

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 状態を確認（プレイヤーは削除されていないはず）
    const stateResponse = await app.request(
      `/sessions/${session.session_id}/state`,
    );
    const statePayload = (await stateResponse.json()) as SessionResponse;

    expect(statePayload.state.players).toHaveLength(2);
    expect(statePayload.state.players.some((p) => p.id === 'alice')).toBe(true);
  });

  it('player_id なしの接続切断ではプレイヤーは削除されない', async () => {
    const app = createApp({
      now: () => '2025-01-01T00:00:00.000Z',
      generateSessionId: () => 'session-no-player-id',
    });

    // セッション作成
    const createResponse = await app.request('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ max_players: 2 }),
    });
    const createPayload = (await createResponse.json()) as SessionResponse;
    const sessionId = createPayload.session_id;

    // プレイヤー参加
    await app.request(`/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        player_id: 'alice',
        display_name: 'Alice',
      }),
    });

    // player_id なしで SSE 接続
    const response = await app.request(`/sessions/${sessionId}/stream`);

    expect(response.status).toBe(200);

    const body = response.body;
    expect(body).not.toBeNull();

    if (!body) {
      return;
    }

    const reader = createSseEventReader(body);

    // イベントを 1 つ受信
    await readNextDataEvent(reader);

    // SSE 接続を切断
    await reader.cancel();

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 状態を確認（プレイヤーは削除されていないはず）
    const stateResponse = await app.request(`/sessions/${sessionId}/state`);
    const statePayload = (await stateResponse.json()) as SessionResponse;

    expect(statePayload.state.players).toHaveLength(1);
    expect(statePayload.state.players[0]?.id).toBe('alice');
  });
});
