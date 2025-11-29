import { createApp } from 'app.js';
import { describe, expect, it } from 'vitest';
import type { CreateAppOptions } from 'app.js';
import type { ScoreSummary } from 'services/scoreService.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

type SessionResponse = {
  session_id: string;
  state_version: string;
  state: GameSnapshot;
};

type ActionResponse = SessionResponse & {
  turn_context: {
    turn: number;
    current_player_id: string;
    card_in_center: number | null;
    awaiting_action: boolean;
    central_pot: number;
    chips: Record<string, number>;
  };
};

type ResultsResponse = {
  session_id: string;
  final_results: ScoreSummary;
};

type SseEvent = {
  id: string;
  event: string;
  data: string;
};

const createSseReader = (body: ReadableStream<Uint8Array>) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const readEvent = async (): Promise<SseEvent | null> => {
    while (true) {
      const separatorIndex = buffer.indexOf('\n\n');

      if (separatorIndex !== -1) {
        const chunk = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const payload: SseEvent = { id: '', event: '', data: '' };
        const lines = chunk.split('\n').filter((line) => line.length > 0);
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

        if (payload.event.length > 0 || payload.data.length > 0) {
          return payload;
        }

        continue;
      }

      const result = await reader.read();

      if (result.done) {
        return null;
      }

      buffer += decoder.decode(result.value, { stream: true });
    }
  };

  const cancel = async () => {
    await reader.cancel();
  };

  return { readEvent, cancel };
};

const createTestApp = (overrides: Partial<CreateAppOptions> = {}) => {
  const app = createApp({
    now: () => '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  return { app };
};

/**
 * セッションを作成し、プレイヤーを参加させ、ゲームを開始するヘルパー。
 * @param app アプリケーション。
 * @param players プレイヤー情報。
 * @param seed 乱数シード。
 */
const postSession = async (
  app: ReturnType<typeof createTestApp>['app'],
  players: { id: string; display_name: string }[],
  seed: string,
) => {
  // セッション作成
  const createResponse = await app.request('/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ max_players: players.length, seed }),
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

const postAction = async (
  app: ReturnType<typeof createTestApp>['app'],
  sessionId: string,
  commandId: string,
  stateVersion: string,
  playerId: string,
  action: 'placeChip' | 'takeCard',
) => {
  const response = await app.request(`/sessions/${sessionId}/actions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      command_id: commandId,
      state_version: stateVersion,
      player_id: playerId,
      action,
    }),
  });

  return {
    status: response.status,
    payload: (await response.json()) as ActionResponse,
  };
};

const getResults = async (
  app: ReturnType<typeof createTestApp>['app'],
  sessionId: string,
) => {
  const response = await app.request(`/sessions/${sessionId}/results`);

  return {
    status: response.status,
    payload: (await response.json()) as ResultsResponse,
  };
};

describe('フルゲーム統合テスト', () => {
  it('2人プレイでゲームを終了し結果を取得できる', async () => {
    const { app } = createTestApp();
    const players = [
      { id: 'alice', display_name: 'Alice' },
      { id: 'bob', display_name: 'Bob' },
    ];

    const session = await postSession(app, players, 'integration-2p');
    let commandIndex = 0;

    // 24枚のカードを処理するまでゲームを進める
    let isGameOver = false;

    while (!isGameOver) {
      const stateResponse = await app.request(
        `/sessions/${session.session_id}/state`,
      );
      const statePayload = (await stateResponse.json()) as SessionResponse;

      if (statePayload.state.phase === 'completed') {
        isGameOver = true;

        break;
      }

      const currentPlayerId = statePayload.state.turnState.currentPlayerId;
      const chips = statePayload.state.chips[currentPlayerId] ?? 0;

      // チップがある場合はランダムにplaceChipかtakeCard、なければtakeCard
      const action: 'placeChip' | 'takeCard' =
        chips > 0 && commandIndex % 3 !== 2 ? 'placeChip' : 'takeCard';

      commandIndex += 1;
      const result = await postAction(
        app,
        session.session_id,
        `cmd-${commandIndex}`,
        statePayload.state_version,
        currentPlayerId,
        action,
      );

      expect(result.status).toBe(200);

      if (result.payload.state.phase === 'completed') {
        isGameOver = true;
      }
    }

    // 結果取得
    const results = await getResults(app, session.session_id);

    expect(results.status).toBe(200);
    expect(results.payload.final_results.placements).toHaveLength(2);
  });

  it('4人プレイでゲームを終了し正しい順位が計算される', async () => {
    const { app } = createTestApp();
    const players = [
      { id: 'p1', display_name: 'Player 1' },
      { id: 'p2', display_name: 'Player 2' },
      { id: 'p3', display_name: 'Player 3' },
      { id: 'p4', display_name: 'Player 4' },
    ];

    const session = await postSession(app, players, 'integration-4p');
    let commandIndex = 0;
    let isGameOver = false;

    while (!isGameOver) {
      const stateResponse = await app.request(
        `/sessions/${session.session_id}/state`,
      );
      const statePayload = (await stateResponse.json()) as SessionResponse;

      if (statePayload.state.phase === 'completed') {
        isGameOver = true;

        break;
      }

      const currentPlayerId = statePayload.state.turnState.currentPlayerId;
      const chips = statePayload.state.chips[currentPlayerId] ?? 0;

      // チップ枯渇が起きにくいように早めにカードを取る戦略
      const action: 'placeChip' | 'takeCard' =
        chips > 5 && commandIndex % 2 === 0 ? 'placeChip' : 'takeCard';

      commandIndex += 1;
      const result = await postAction(
        app,
        session.session_id,
        `cmd-${commandIndex}`,
        statePayload.state_version,
        currentPlayerId,
        action,
      );

      expect(result.status).toBe(200);

      if (result.payload.state.phase === 'completed') {
        isGameOver = true;
      }
    }

    const results = await getResults(app, session.session_id);

    expect(results.status).toBe(200);
    expect(results.payload.final_results.placements).toHaveLength(4);

    const ranks = results.payload.final_results.placements.map(
      (placement) => placement.rank,
    );

    expect(ranks[0]).toBe(1);
  });

  it('チップ枯渇によりカード取得が強制される', async () => {
    const { app } = createTestApp();
    const players = [
      { id: 'alice', display_name: 'Alice' },
      { id: 'bob', display_name: 'Bob' },
    ];

    const session = await postSession(app, players, 'chip-depletion-test');

    // アリスが連続でチップを置いてチップを0にする
    let commandIndex = 0;

    // 最初のプレイヤーがチップを使い切るまでplaceChipを繰り返す
    for (let i = 0; i < 15; i += 1) {
      const stateResponse = await app.request(
        `/sessions/${session.session_id}/state`,
      );
      const statePayload = (await stateResponse.json()) as SessionResponse;

      if (statePayload.state.phase === 'completed') {
        break;
      }

      const currentPlayerId = statePayload.state.turnState.currentPlayerId;
      const chips = statePayload.state.chips[currentPlayerId] ?? 0;

      if (chips === 0) {
        // チップ0でtakeCardのみ許可されることを確認
        commandIndex += 1;
        const failedResult = await app.request(
          `/sessions/${session.session_id}/actions`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              command_id: `cmd-fail-${commandIndex}`,
              state_version: statePayload.state_version,
              player_id: currentPlayerId,
              action: 'placeChip',
            }),
          },
        );

        expect(failedResult.status).toBe(422);

        // takeCardは成功する
        commandIndex += 1;
        const result = await postAction(
          app,
          session.session_id,
          `cmd-${commandIndex}`,
          statePayload.state_version,
          currentPlayerId,
          'takeCard',
        );

        expect(result.status).toBe(200);

        break;
      }

      commandIndex += 1;
      const result = await postAction(
        app,
        session.session_id,
        `cmd-${commandIndex}`,
        statePayload.state_version,
        currentPlayerId,
        'placeChip',
      );

      expect(result.status).toBe(200);
    }
  });

  it('stateVersion 競合時は 409 を返し最新取得後に再送できる', async () => {
    const { app } = createTestApp();
    const players = [
      { id: 'alice', display_name: 'Alice' },
      { id: 'bob', display_name: 'Bob' },
    ];

    const session = await postSession(app, players, 'conflict-test');
    const firstPlayerId = session.state.turnState.currentPlayerId;

    // 正常なアクション
    const firstResult = await postAction(
      app,
      session.session_id,
      'cmd-1',
      session.state_version,
      firstPlayerId,
      'placeChip',
    );

    expect(firstResult.status).toBe(200);

    // 古いバージョンで再送しようとする -> 409
    const conflictResult = await app.request(
      `/sessions/${session.session_id}/actions`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          command_id: 'cmd-conflict',
          state_version: session.state_version, // 古いバージョン
          player_id: firstPlayerId,
          action: 'placeChip',
        }),
      },
    );

    expect(conflictResult.status).toBe(409);

    // 最新状態を取得して再送
    const latestState = await app.request(
      `/sessions/${session.session_id}/state`,
    );
    const latestPayload = (await latestState.json()) as SessionResponse;

    const retryResult = await postAction(
      app,
      session.session_id,
      'cmd-retry',
      latestPayload.state_version,
      latestPayload.state.turnState.currentPlayerId,
      'placeChip',
    );

    expect(retryResult.status).toBe(200);
  });

  it('SSE 接続中にゲーム終了まで進めると state.final イベントを受信できる', async () => {
    const { app } = createTestApp();
    const players = [
      { id: 'alice', display_name: 'Alice' },
      { id: 'bob', display_name: 'Bob' },
    ];

    const session = await postSession(app, players, 'sse-final-test');

    // SSE 接続
    const sseResponse = await app.request(
      `/sessions/${session.session_id}/stream`,
    );

    expect(sseResponse.status).toBe(200);

    const sseReader = createSseReader(sseResponse.body!);

    // 初期イベント (state.delta) をスキップ
    await sseReader.readEvent(); // state.delta

    // ゲームを終了まで進める
    let commandIndex = 0;
    let isGameOver = false;
    let receivedFinalEvent = false;
    const receivedEventTypes: string[] = [];

    while (!isGameOver) {
      const stateResponse = await app.request(
        `/sessions/${session.session_id}/state`,
      );
      const statePayload = (await stateResponse.json()) as SessionResponse;

      if (statePayload.state.phase === 'completed') {
        isGameOver = true;

        break;
      }

      const currentPlayerId = statePayload.state.turnState.currentPlayerId;
      const chips = statePayload.state.chips[currentPlayerId] ?? 0;

      const action: 'placeChip' | 'takeCard' =
        chips > 0 && commandIndex % 3 !== 2 ? 'placeChip' : 'takeCard';

      commandIndex += 1;
      const result = await postAction(
        app,
        session.session_id,
        `cmd-final-${commandIndex}`,
        statePayload.state_version,
        currentPlayerId,
        action,
      );

      expect(result.status).toBe(200);

      if (result.payload.state.phase === 'completed') {
        isGameOver = true;
      }

      // SSE イベントを消費
      const event = await sseReader.readEvent();

      if (event) {
        receivedEventTypes.push(event.event);

        if (event.event === 'state.final') {
          receivedFinalEvent = true;
        }
      }
    }

    // 残りのイベントを読み取る
    while (true) {
      const event = await sseReader.readEvent();

      if (!event) {
        break;
      }

      receivedEventTypes.push(event.event);

      if (event.event === 'state.final') {
        receivedFinalEvent = true;

        break;
      }
    }

    await sseReader.cancel();

    // ステート更新イベントが受信されていることを確認
    expect(receivedEventTypes).toContain('state.delta');
    expect(receivedFinalEvent).toBe(true);
  });
});
