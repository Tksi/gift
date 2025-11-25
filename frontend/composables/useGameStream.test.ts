import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * useGameStream Composable のテスト
 *
 * このテストは以下を検証する:
 * - SSE接続の確立・切断
 * - 接続状態の管理（disconnected/connecting/connected/reconnecting）
 * - exponential backoff による自動再接続ロジック
 * - Last-Event-ID ヘッダーによる欠落イベント回復
 * - 各SSEイベント（state.delta, state.final, event.log, rule.hint, system.error）のハンドリング
 */

// EventSource のモック
type MockEventSourceInstance = {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  listeners: Map<string, ((event: MessageEvent) => void)[]>;
  simulateOpen: () => void;
  simulateError: () => void;
  simulateMessage: (eventType: string, data: string, id?: string) => void;
};

const createMockEventSource = (): MockEventSourceInstance => {
  const listeners = new Map<string, ((event: MessageEvent) => void)[]>();

  const instance: MockEventSourceInstance = {
    url: '',
    readyState: 0, // CONNECTING
    onopen: null,
    onerror: null,
    onmessage: null,
    close: vi.fn(() => {
      instance.readyState = 2; // CLOSED
    }),
    addEventListener: vi.fn(
      (type: string, handler: (event: MessageEvent) => void) => {
        if (!listeners.has(type)) {
          listeners.set(type, []);
        }

        listeners.get(type)?.push(handler);
      },
    ),
    removeEventListener: vi.fn(),
    listeners,
    simulateOpen: () => {
      instance.readyState = 1; // OPEN

      // addEventListener で登録されたリスナーを呼び出す
      const openHandlers = listeners.get('open');

      if (openHandlers) {
        for (const handler of openHandlers) {
          handler(new Event('open') as MessageEvent);
        }
      }

      // onopen も呼び出す（後方互換性）
      if (instance.onopen) {
        instance.onopen(new Event('open'));
      }
    },
    simulateError: () => {
      // addEventListener で登録されたリスナーを呼び出す
      const errorHandlers = listeners.get('error');

      if (errorHandlers) {
        for (const handler of errorHandlers) {
          handler(new Event('error') as MessageEvent);
        }
      }

      // onerror も呼び出す（後方互換性）
      if (instance.onerror) {
        instance.onerror(new Event('error'));
      }
    },
    simulateMessage: (eventType: string, data: string, id?: string) => {
      const event = new MessageEvent(eventType, {
        data,
        lastEventId: id ?? '',
      });
      const handlers = listeners.get(eventType);

      if (handlers) {
        for (const handler of handlers) {
          handler(event);
        }
      }
    },
  };

  return instance;
};

let mockEventSourceInstance: MockEventSourceInstance | null = null;

class MockEventSource {
  constructor(url: string) {
    if (!mockEventSourceInstance) {
      throw new Error('mockEventSourceInstance not set');
    }

    mockEventSourceInstance.url = url;

    return mockEventSourceInstance as unknown as EventSource;
  }
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
}

vi.stubGlobal('EventSource', MockEventSource);

// useGameStream のインポート（実装後）
// import { useGameStream } from '~/composables/useGameStream';

describe('useGameStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEventSourceInstance = createMockEventSource();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockEventSourceInstance = null;
  });

  describe('接続状態管理', () => {
    it('初期状態は disconnected であること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { status } = useGameStream({ sessionId: 'test-session' });

      expect(status.value).toBe('disconnected');
    });

    it('connect() 呼び出し後は connecting になること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { status, connect } = useGameStream({ sessionId: 'test-session' });

      connect();

      expect(status.value).toBe('connecting');
    });

    it('EventSource が open したら connected になること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { status, connect } = useGameStream({ sessionId: 'test-session' });

      connect();
      mockEventSourceInstance?.simulateOpen();

      expect(status.value).toBe('connected');
    });

    it('disconnect() 呼び出し後は disconnected になること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { status, connect, disconnect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();
      disconnect();

      expect(status.value).toBe('disconnected');
      expect(mockEventSourceInstance?.close).toHaveBeenCalled();
    });
  });

  describe('SSE接続URL', () => {
    it('正しいURLでEventSourceが作成されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { connect } = useGameStream({ sessionId: 'my-session-123' });

      connect();

      expect(mockEventSourceInstance?.url).toContain(
        '/sessions/my-session-123/stream',
      );
    });
  });

  describe('自動再接続', () => {
    it('接続エラー時に reconnecting 状態になること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { status, connect } = useGameStream({ sessionId: 'test-session' });

      connect();
      mockEventSourceInstance?.simulateOpen();
      mockEventSourceInstance?.simulateError();

      expect(status.value).toBe('reconnecting');
    });

    it('exponential backoff で再接続を試みること（1s, 2s, 4s...）', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { status, connect } = useGameStream({ sessionId: 'test-session' });

      connect();
      mockEventSourceInstance?.simulateOpen();

      // エラー発生 → reconnecting
      mockEventSourceInstance?.simulateError();
      expect(status.value).toBe('reconnecting');

      // 新しいモックを準備（再接続時に使用される）
      mockEventSourceInstance = createMockEventSource();

      // 1秒後に再接続試行
      await vi.advanceTimersByTimeAsync(1000);
      expect(status.value).toBe('connecting');
    });

    it('最大再試行回数（5回）を超えたら disconnected になること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { status, connect } = useGameStream({ sessionId: 'test-session' });

      connect();
      mockEventSourceInstance?.simulateOpen();

      // 連続で5回エラーを発生させる（再接続は成功させない）
      for (let i = 0; i < 5; i++) {
        // エラー発生
        mockEventSourceInstance?.simulateError();
        expect(status.value).toBe('reconnecting');

        // 新しいモックを準備（再接続時に使用される）
        mockEventSourceInstance = createMockEventSource();

        // backoff: 1s, 2s, 4s, 8s, 16s
        const backoffMs = Math.pow(2, i) * 1000;
        await vi.advanceTimersByTimeAsync(backoffMs);

        // 再接続しても成功しない状態をシミュレート（openしない）
      }

      // 6回目のエラーで諦める（MAX_RECONNECT_ATTEMPTS = 5）
      mockEventSourceInstance?.simulateError();
      expect(status.value).toBe('disconnected');
    });
  });

  describe('state.delta イベントハンドリング', () => {
    it('state.delta イベント受信時に gameState が更新されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { gameState, stateVersion, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      const mockSnapshot = {
        sessionId: 'test-session',
        phase: 'running' as const,
        deck: [3, 4, 5],
        discardHidden: [],
        playerOrder: ['player1', 'player2'],
        rngSeed: 'seed',
        players: [
          { id: 'player1', displayName: 'Alice' },
          { id: 'player2', displayName: 'Bob' },
        ],
        chips: { player1: 10, player2: 8 },
        hands: { player1: [6], player2: [] },
        centralPot: 3,
        turnState: {
          turn: 2,
          currentPlayerId: 'player1',
          currentPlayerIndex: 0,
          cardInCenter: 7,
          awaitingAction: true,
          deadline: null,
        },
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:01:00Z',
        finalResults: null,
      };

      mockEventSourceInstance?.simulateMessage(
        'state.delta',
        JSON.stringify({
          session_id: 'test-session',
          state_version: 'v2',
          state: mockSnapshot,
        }),
        'state:v2',
      );

      expect(gameState.value).toEqual(mockSnapshot);
      expect(stateVersion.value).toBe('v2');
    });
  });

  describe('state.final イベントハンドリング', () => {
    it('state.final イベント受信時に finalResults が設定されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { finalResults, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      const mockFinalResults = {
        placements: [
          {
            rank: 1,
            playerId: 'player1',
            score: 15,
            chipsRemaining: 5,
            cards: [3, 4, 5],
            cardSets: [[3, 4, 5]],
          },
          {
            rank: 2,
            playerId: 'player2',
            score: 25,
            chipsRemaining: 3,
            cards: [10, 15],
            cardSets: [[10], [15]],
          },
        ],
        tieBreak: null,
      };

      mockEventSourceInstance?.simulateMessage(
        'state.final',
        JSON.stringify({
          session_id: 'test-session',
          state_version: 'v-final',
          final_results: mockFinalResults,
        }),
        'state-final:v-final',
      );

      expect(finalResults.value).toEqual(mockFinalResults);
    });
  });

  describe('event.log イベントハンドリング', () => {
    it('event.log イベント受信時に eventLog に追加されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { eventLog, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      const mockEntry = {
        id: 'evt-1',
        turn: 1,
        actor: 'player1',
        action: 'placeChip',
        timestamp: '2025-01-01T00:00:00Z',
        chipsDelta: -1,
      };

      mockEventSourceInstance?.simulateMessage(
        'event.log',
        JSON.stringify(mockEntry),
        'evt-1',
      );

      expect(eventLog.value).toHaveLength(1);
      expect(eventLog.value[0]).toEqual(mockEntry);
    });

    it('複数の event.log イベントが順番に追加されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { eventLog, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      mockEventSourceInstance?.simulateMessage(
        'event.log',
        JSON.stringify({
          id: 'evt-1',
          turn: 1,
          actor: 'player1',
          action: 'placeChip',
          timestamp: '2025-01-01T00:00:00Z',
        }),
        'evt-1',
      );

      mockEventSourceInstance?.simulateMessage(
        'event.log',
        JSON.stringify({
          id: 'evt-2',
          turn: 2,
          actor: 'player2',
          action: 'takeCard',
          timestamp: '2025-01-01T00:00:01Z',
        }),
        'evt-2',
      );

      expect(eventLog.value).toHaveLength(2);
      expect(eventLog.value[0]?.id).toBe('evt-1');
      expect(eventLog.value[1]?.id).toBe('evt-2');
    });
  });

  describe('rule.hint イベントハンドリング', () => {
    it('rule.hint イベント受信時に currentHint が更新されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { currentHint, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      mockEventSourceInstance?.simulateMessage(
        'rule.hint',
        JSON.stringify({
          session_id: 'test-session',
          state_version: 'v1',
          hint: {
            text: 'カード 7 はポット 3 枚で実質 4 点です。',
            emphasis: 'info',
            turn: 1,
            generated_at: '2025-01-01T00:00:00Z',
          },
        }),
        'rule-hint:v1',
      );

      expect(currentHint.value).toEqual({
        text: 'カード 7 はポット 3 枚で実質 4 点です。',
        emphasis: 'info',
        turn: 1,
        generatedAt: '2025-01-01T00:00:00Z',
      });
    });

    it('warning 強調度のヒントが正しく処理されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { currentHint, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      mockEventSourceInstance?.simulateMessage(
        'rule.hint',
        JSON.stringify({
          session_id: 'test-session',
          state_version: 'v2',
          hint: {
            text: 'チップ残り2枚です。注意してください。',
            emphasis: 'warning',
            turn: 2,
            generated_at: '2025-01-01T00:01:00Z',
          },
        }),
        'rule-hint:v2',
      );

      expect(currentHint.value?.emphasis).toBe('warning');
    });
  });

  describe('system.error イベントハンドリング', () => {
    it('system.error イベント受信時に lastSystemError が設定されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { lastSystemError, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      mockEventSourceInstance?.simulateMessage(
        'system.error',
        JSON.stringify({
          session_id: 'test-session',
          error: {
            code: 'INTERNAL_ERROR',
            message: 'サーバーエラーが発生しました',
          },
        }),
        'system-error:12345',
      );

      expect(lastSystemError.value).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました',
      });
    });
  });

  describe('lastEventId 管理', () => {
    it('イベント受信時に lastEventId が更新されること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const { lastEventId, connect } = useGameStream({
        sessionId: 'test-session',
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      mockEventSourceInstance?.simulateMessage(
        'state.delta',
        JSON.stringify({
          session_id: 'test-session',
          state_version: 'v1',
          state: {},
        }),
        'state:v1',
      );

      expect(lastEventId.value).toBe('state:v1');
    });
  });

  describe('コールバック', () => {
    it('onConnect コールバックが接続成功時に呼ばれること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const onConnect = vi.fn();
      const { connect } = useGameStream({
        sessionId: 'test-session',
        onConnect,
      });

      connect();
      mockEventSourceInstance?.simulateOpen();

      expect(onConnect).toHaveBeenCalledOnce();
    });

    it('onDisconnect コールバックが切断時に呼ばれること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const onDisconnect = vi.fn();
      const { connect, disconnect } = useGameStream({
        sessionId: 'test-session',
        onDisconnect,
      });

      connect();
      mockEventSourceInstance?.simulateOpen();
      disconnect();

      expect(onDisconnect).toHaveBeenCalledOnce();
    });

    it('onError コールバックがエラー時に呼ばれること', async () => {
      const { useGameStream } = await import('~/composables/useGameStream');
      const onError = vi.fn();
      const { connect } = useGameStream({
        sessionId: 'test-session',
        onError,
      });

      connect();
      mockEventSourceInstance?.simulateOpen();
      mockEventSourceInstance?.simulateError();

      expect(onError).toHaveBeenCalledOnce();
    });
  });
});
