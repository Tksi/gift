import { createApp } from 'app.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

type SessionResponse = {
  session_id: string;
  state_version: string;
  state: GameSnapshot;
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

const createSession = async () => {
  const app = createApp({
    now: () => '2025-01-01T00:00:00.000Z',
    generateSessionId: () => 'session-test',
  });

  const response = await app.request('/sessions', {
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

  const session = (await response.json()) as SessionResponse;

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
    const event = await readNextDataEvent(reader);

    expect(event).not.toBeNull();

    if (!event) {
      return;
    }

    expect(event.event).toBe('state.delta');
    const data = JSON.parse(event.data) as SessionResponse;
    expect(data.session_id).toBe(session.session_id);
    expect(data.state_version).toBe(session.state_version);
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
    await readNextDataEvent(reader);

    const actorId = session.state.turnState.currentPlayerId;

    const actionResponse = await app.request(
      `/sessions/${session.session_id}/actions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          command_id: 'cmd-1',
          state_version: session.state_version,
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
    await reader.cancel();
  });

  it('存在しないセッションに対する接続は 404 を返す', async () => {
    const app = createApp();
    const response = await app.request('/sessions/missing/stream');
    expect(response.status).toBe(404);
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
    const firstLog = await readNextDataEvent(initialReader);
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
    const replayedLog = await readNextDataEvent(reader);

    expect(replayedLog).not.toBeNull();

    if (!replayedLog) {
      return;
    }

    expect(replayedLog.id).not.toBe(firstLog.id);
    expect(replayedLog.event).toBe('event.log');
    await reader.cancel();
  });
});
