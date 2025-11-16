import { createApp } from 'app.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

type SessionResponse = {
  session_id: string;
  state_version: string;
  state: GameSnapshot;
};

type HintResponse = {
  session_id: string;
  state_version: string;
  generated_from_version: string;
  hint: {
    text: string;
    emphasis: string;
    turn: number;
    generated_at: string;
  };
};

const createSession = async () => {
  const app = createApp({
    now: () => '2025-01-01T00:00:00.000Z',
    generateSessionId: () => 'session-hint',
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

describe('GET /sessions/{sessionId}/hint', () => {
  it('現在の状態に基づくルールヒントを返す', async () => {
    const { app, session } = await createSession();

    const response = await app.request(`/sessions/${session.session_id}/hint`);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as HintResponse;
    expect(payload.session_id).toBe(session.session_id);
    expect(payload.state_version).toBe(session.state_version);
    expect(payload.generated_from_version).toBe(session.state_version);
    expect(payload.hint.text).toContain('カード');
    expect(payload.hint.emphasis).toMatch(/info|warning/);
  });

  it('存在しないセッションの場合は 404 を返す', async () => {
    const app = createApp();

    const response = await app.request('/sessions/missing/hint');
    expect(response.status).toBe(404);
  });
});
