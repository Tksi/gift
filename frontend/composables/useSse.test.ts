import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSse } from './useSse';
import type { SseEvent } from './useSse';

/**
 * EventSource のモック実装
 */
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState: number;
  private _eventListeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, new Set());
    }
    this._eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this._eventListeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // テストヘルパー: open イベントをシミュレート
  _simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    const listeners = this._eventListeners.get('open');
    listeners?.forEach((listener) => listener(new Event('open')));
  }

  // テストヘルパー: イベントをシミュレート
  _simulateEvent(eventName: string, data: string, id?: string) {
    const event = new MessageEvent(eventName, {
      data,
      lastEventId: id ?? '',
    });
    const listeners = this._eventListeners.get(eventName);
    listeners?.forEach((listener) => listener(event));
  }

  // テストヘルパー: error イベントをシミュレート
  _simulateError() {
    this.readyState = MockEventSource.CLOSED;
    const listeners = this._eventListeners.get('error');
    listeners?.forEach((listener) => listener(new Event('error')));
  }
}

let mockEventSourceInstance: MockEventSource | null = null;
const mockEventSourceConstructor = vi.fn((url: string) => {
  mockEventSourceInstance = new MockEventSource(url);
  return mockEventSourceInstance;
});

describe('useSse', () => {
  const apiBase = 'http://localhost:3000';

  beforeEach(() => {
    vi.stubGlobal('EventSource', mockEventSourceConstructor);
    mockEventSourceInstance = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('接続管理', () => {
    it('connect を呼び出すと EventSource が作成される', () => {
      const onEvent = vi.fn();
      const { connect } = useSse({ apiBase, onEvent });

      connect('session-123');

      expect(mockEventSourceConstructor).toHaveBeenCalledWith(
        'http://localhost:3000/sessions/session-123/stream',
      );
    });

    it('playerId を指定すると URL に player_id クエリパラメータが含まれる', () => {
      const onEvent = vi.fn();
      const { connect } = useSse({ apiBase, onEvent });

      connect('session-123', 'alice');

      expect(mockEventSourceConstructor).toHaveBeenCalledWith(
        'http://localhost:3000/sessions/session-123/stream?player_id=alice',
      );
    });

    it('playerId に特殊文字が含まれる場合はエンコードされる', () => {
      const onEvent = vi.fn();
      const { connect } = useSse({ apiBase, onEvent });

      connect('session-123', 'user&name=test');

      expect(mockEventSourceConstructor).toHaveBeenCalledWith(
        'http://localhost:3000/sessions/session-123/stream?player_id=user%26name%3Dtest',
      );
    });

    it('connect 後に接続状態が connecting になる', () => {
      const onEvent = vi.fn();
      const { connect, connectionState } = useSse({ apiBase, onEvent });

      expect(connectionState.value).toBe('disconnected');

      connect('session-123');

      expect(connectionState.value).toBe('connecting');
    });

    it('onopen イベントで接続状態が connected になる', () => {
      const onEvent = vi.fn();
      const { connect, connectionState } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      expect(connectionState.value).toBe('connected');
    });

    it('disconnect を呼び出すと EventSource.close が呼ばれ disconnected 状態になる', () => {
      const onEvent = vi.fn();
      const { connect, disconnect, connectionState } = useSse({
        apiBase,
        onEvent,
      });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      const closeSpy = vi.spyOn(mockEventSourceInstance!, 'close');
      disconnect();

      expect(closeSpy).toHaveBeenCalled();
      expect(connectionState.value).toBe('disconnected');
    });

    it('sessionId が空の場合は接続しない', () => {
      const onEvent = vi.fn();
      const { connect, connectionState } = useSse({ apiBase, onEvent });

      connect('');

      expect(mockEventSourceConstructor).not.toHaveBeenCalled();
      expect(connectionState.value).toBe('disconnected');
    });
  });

  describe('イベント受信', () => {
    it('state.delta イベントを受信すると onEvent コールバックが呼ばれる', () => {
      const onEvent = vi.fn();
      const { connect } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      const eventData = JSON.stringify({
        session_id: 'session-123',
        state_version: 'v1',
        state: { phase: 'running' },
      });

      mockEventSourceInstance!._simulateEvent(
        'state.delta',
        eventData,
        'state:v1',
      );

      expect(onEvent).toHaveBeenCalledWith({
        id: 'state:v1',
        event: 'state.delta',
        data: {
          session_id: 'session-123',
          state_version: 'v1',
          state: { phase: 'running' },
        },
      } satisfies SseEvent);
    });

    it('state.final イベントを受信すると onEvent コールバックが呼ばれる', () => {
      const onEvent = vi.fn();
      const { connect } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      const eventData = JSON.stringify({
        session_id: 'session-123',
        state_version: 'v2',
        final_results: { winner: 'player-1' },
      });

      mockEventSourceInstance!._simulateEvent(
        'state.final',
        eventData,
        'state-final:v2',
      );

      expect(onEvent).toHaveBeenCalledWith({
        id: 'state-final:v2',
        event: 'state.final',
        data: {
          session_id: 'session-123',
          state_version: 'v2',
          final_results: { winner: 'player-1' },
        },
      } satisfies SseEvent);
    });

    it('lastEventId が更新される', () => {
      const onEvent = vi.fn();
      const { connect, lastEventId } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      expect(lastEventId.value).toBeNull();

      mockEventSourceInstance!._simulateEvent('state.delta', '{}', 'state:v1');

      expect(lastEventId.value).toBe('state:v1');

      mockEventSourceInstance!._simulateEvent('state.delta', '{}', 'state:v2');

      expect(lastEventId.value).toBe('state:v2');
    });
  });

  describe('エラーハンドリング', () => {
    it('onerror イベントで onError コールバックが呼ばれる', () => {
      const onEvent = vi.fn();
      const onError = vi.fn();
      const { connect } = useSse({ apiBase, onEvent, onError });

      connect('session-123');
      mockEventSourceInstance!._simulateError();

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('自動再接続 (Task 2.2)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('接続切断時に reconnecting 状態になり自動再接続を試行する', async () => {
      const onEvent = vi.fn();
      const { connect, connectionState } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();
      expect(connectionState.value).toBe('connected');

      // 最初のインスタンスを保存
      const firstInstance = mockEventSourceInstance;

      // エラー発生
      mockEventSourceInstance!._simulateError();

      expect(connectionState.value).toBe('reconnecting');

      // 再接続タイマーを進める (初回は1000ms)
      await vi.advanceTimersByTimeAsync(1000);

      // 新しい EventSource が作成される
      expect(mockEventSourceInstance).not.toBe(firstInstance);
    });

    it('再接続時も同じ URL で EventSource を再作成する (Last-Event-ID はブラウザが自動送信)', async () => {
      const onEvent = vi.fn();
      const { connect, lastEventId } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      // イベントを受信して lastEventId を更新
      mockEventSourceInstance!._simulateEvent('state.delta', '{}', 'state:v5');
      expect(lastEventId.value).toBe('state:v5');

      // エラー発生
      mockEventSourceInstance!._simulateError();

      // 再接続タイマーを進める
      await vi.advanceTimersByTimeAsync(1000);

      // 同じ URL で再接続 (ブラウザが Last-Event-ID ヘッダーを自動送信)
      expect(mockEventSourceConstructor).toHaveBeenLastCalledWith(
        'http://localhost:3000/sessions/session-123/stream',
      );
    });

    it('exponential backoff で再接続間隔が増加する', async () => {
      const onEvent = vi.fn();
      const { connect, connectionState } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      // 1回目のエラー
      mockEventSourceInstance!._simulateError();
      expect(connectionState.value).toBe('reconnecting');

      // 1回目の再接続 (1000ms後)
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(2);
      mockEventSourceInstance!._simulateError(); // すぐにまたエラー

      // 2回目の再接続 (2000ms後)
      await vi.advanceTimersByTimeAsync(1500);
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(2); // まだ
      await vi.advanceTimersByTimeAsync(500);
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(3);
      mockEventSourceInstance!._simulateError();

      // 3回目の再接続 (4000ms後)
      await vi.advanceTimersByTimeAsync(3500);
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(3); // まだ
      await vi.advanceTimersByTimeAsync(500);
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(4);
    });

    it('最大リトライ回数を超えるとエラーコールバックが呼ばれ disconnected になる', async () => {
      const onEvent = vi.fn();
      const onError = vi.fn();
      const { connect, connectionState } = useSse({
        apiBase,
        onEvent,
        onError,
        maxRetries: 3,
      });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      // 3回リトライ
      for (let i = 0; i < 3; i++) {
        mockEventSourceInstance!._simulateError();
        await vi.advanceTimersByTimeAsync(30_000); // 十分な時間
      }

      // 4回目のエラー
      mockEventSourceInstance!._simulateError();

      expect(connectionState.value).toBe('disconnected');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Max retries'),
        }),
      );
    });

    it('再接続成功後はリトライカウントがリセットされる', async () => {
      const onEvent = vi.fn();
      const { connect, connectionState } = useSse({ apiBase, onEvent });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      // 1回目のエラー
      mockEventSourceInstance!._simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      // 再接続成功
      mockEventSourceInstance!._simulateOpen();
      expect(connectionState.value).toBe('connected');

      // 再度エラー - リトライカウントはリセットされているので 1000ms 後に再接続
      mockEventSourceInstance!._simulateError();
      expect(connectionState.value).toBe('reconnecting');

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(3);
    });

    it('onReconnect コールバックが再接続成功時に呼ばれる', async () => {
      const onEvent = vi.fn();
      const onReconnect = vi.fn();
      const { connect } = useSse({ apiBase, onEvent, onReconnect });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      // エラー発生
      mockEventSourceInstance!._simulateError();

      // 再接続タイマーを進める
      await vi.advanceTimersByTimeAsync(1000);

      // 再接続成功
      mockEventSourceInstance!._simulateOpen();

      expect(onReconnect).toHaveBeenCalled();
    });

    it('disconnect 呼び出し時は再接続をキャンセルする', async () => {
      const onEvent = vi.fn();
      const { connect, disconnect, connectionState } = useSse({
        apiBase,
        onEvent,
      });

      connect('session-123');
      mockEventSourceInstance!._simulateOpen();

      // エラー発生で再接続待ち状態に
      mockEventSourceInstance!._simulateError();
      expect(connectionState.value).toBe('reconnecting');

      // ユーザーが明示的に切断
      disconnect();
      expect(connectionState.value).toBe('disconnected');

      // タイマーを進めても再接続は発生しない
      const callCount = mockEventSourceConstructor.mock.calls.length;
      await vi.advanceTimersByTimeAsync(10_000);
      expect(mockEventSourceConstructor).toHaveBeenCalledTimes(callCount);
    });
  });
});
