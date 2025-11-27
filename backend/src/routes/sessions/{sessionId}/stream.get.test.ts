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

const readNextEventOfType = async (
  reader: ReturnType<typeof createSseEventReader>,
  type: string,
) => {
  while (true) {
    const event = await readNextDataEvent(reader);

    if (!event) {
      return null;
    }

    if (event.event === type) {
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
  it('最新状態を state.delta と rule.hint イベントとして送信する', async () => {
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

    const hintEvent = await readNextDataEvent(reader);

    expect(hintEvent).not.toBeNull();

    if (!hintEvent) {
      return;
    }

    expect(hintEvent.event).toBe('rule.hint');
    const hintPayload = JSON.parse(hintEvent.data) as {
      hint: { text: string };
    };
    expect(hintPayload.hint.text).toContain('カード');
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

    await readNextDataEvent(reader); // rule.hint を読み飛ばす

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

    const logEvent = await readNextDataEvent(reader);

    expect(logEvent).not.toBeNull();

    if (!logEvent) {
      return;
    }

    expect(logEvent.event).toBe('event.log');
    const logData = JSON.parse(logEvent.data) as {
      id: string;
      actor: string;
      action: string;
    };
    expect(logData.actor).toBe(actorId);
    expect(logData.action).toBe('placeChip');

    const stateEvent = await readNextDataEvent(reader);

    expect(stateEvent).not.toBeNull();

    if (!stateEvent) {
      return;
    }

    expect(stateEvent.event).toBe('state.delta');
    const data = JSON.parse(stateEvent.data) as SessionResponse;
    expect(data.state_version).not.toBe(session.state_version);

    const hintEvent = await readNextDataEvent(reader);

    expect(hintEvent).not.toBeNull();

    if (!hintEvent) {
      return;
    }

    expect(hintEvent.event).toBe('rule.hint');
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

  it('Last-Event-ID がイベントログの場合はその ID 以降を再送する', async () => {
    const { app, session } = await createSession();

    const firstPlayerId = session.state.turnState.currentPlayerId;

    const firstActionResponse = await app.request(
      `/sessions/${session.session_id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          command_id: 'cmd-1',
          state_version: session.state_version,
          player_id: firstPlayerId,
          action: 'placeChip',
        }),
      },
    );

    expect(firstActionResponse.status).toBe(200);

    const firstActionPayload =
      (await firstActionResponse.json()) as SessionResponse;

    const secondPlayerId =
      firstActionPayload.state.turnState.currentPlayerId ??
      session.state.players.find((player) => player.id !== firstPlayerId)?.id ??
      firstPlayerId;

    const secondActionResponse = await app.request(
      `/sessions/${session.session_id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          command_id: 'cmd-2',
          state_version: firstActionPayload.state_version,
          player_id: secondPlayerId,
          action: 'placeChip',
        }),
      },
    );

    expect(secondActionResponse.status).toBe(200);

    const firstResponse = await app.request(
      `/sessions/${session.session_id}/stream`,
    );
    const initialReader = createSseEventReader(firstResponse.body!);
    await readNextDataEvent(initialReader);
    await readNextDataEvent(initialReader);
    const firstLog = await readNextEventOfType(initialReader, 'event.log');
    await initialReader.cancel();

    if (!firstLog) {
      throw new Error('expected log event');
    }

    const reconnectResponse = await app.request(
      `/sessions/${session.session_id}/stream`,
      {
        headers: {
          'last-event-id': firstLog.id,
        },
      },
    );

    const reader = createSseEventReader(reconnectResponse.body!);
    await readNextDataEvent(reader);
    await readNextDataEvent(reader);
    const replayedLog = await readNextEventOfType(reader, 'event.log');

    expect(replayedLog).not.toBeNull();

    if (!replayedLog) {
      return;
    }

    expect(replayedLog.id).not.toBe(firstLog.id);
    expect(replayedLog.event).toBe('event.log');
    await reader.cancel();
  });
});
