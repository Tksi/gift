import { ref } from 'vue';
import type { Ref } from 'vue';

/**
 * SSE イベントの型定義
 */
export type SseEvent = {
  /** イベント ID */
  id: string;
  /** イベント種別 */
  event: string;
  /** イベントデータ */
  data: unknown;
};

/** 接続状態の型 */
export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'reconnecting';

/**
 * useSse のオプション
 */
export type UseSseOptions = {
  /** API ベース URL */
  apiBase: string;
  /** SSE イベント受信時のコールバック */
  onEvent: (event: SseEvent) => void;
  /** 接続エラー時のコールバック */
  onError?: (error: Error) => void;
  /** 再接続時のコールバック */
  onReconnect?: () => void;
  /** 最大リトライ回数 (デフォルト: 5) */
  maxRetries?: number;
};

/**
 * useSse の戻り値
 */
export type UseSseReturn = {
  /** SSE 接続を開始 */
  connect: (sessionId: string, playerId?: string) => void;
  /** SSE 接続を切断 */
  disconnect: () => void;
  /** 接続状態 */
  connectionState: Ref<ConnectionState>;
  /** 最後に受信したイベント ID */
  lastEventId: Ref<string | null>;
};

/** SSE で購読するイベント種別一覧 */
const SSE_EVENT_TYPES = [
  'state.delta',
  'state.final',
  'rule.hint',
  'system.error',
] as const;

/** 初回再接続の待機時間 (ms) */
const BASE_RECONNECT_DELAY = 1000;

/** 再接続間隔の上限 (ms) */
const MAX_RECONNECT_DELAY = 30_000;

/** デフォルトの最大リトライ回数 */
const DEFAULT_MAX_RETRIES = 5;

/**
 * SSE 接続を管理する Composable
 * @param options - 設定オプション
 * @returns 接続制御メソッドと状態
 * @example
 * ```ts
 * const { connect, disconnect, connectionState } = useSse({
 *   apiBase: 'http://localhost:3000',
 *   onEvent: (event) => console.log(event),
 * });
 * connect('session-123');
 * ```
 */
export const useSse = (options: UseSseOptions): UseSseReturn => {
  const {
    apiBase,
    onEvent,
    onError,
    onReconnect,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = options;

  const connectionState = ref<ConnectionState>('disconnected');
  const lastEventId = ref<string | null>(null);

  let eventSource: EventSource | null = null;
  let currentSessionId: string | null = null;
  let currentPlayerId: string | null = null;
  let retryCount = 0;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let wasConnected = false;

  /**
   * イベントをパースして onEvent コールバックに渡す
   * @param eventName - イベント名
   * @param messageEvent - MessageEvent オブジェクト
   */
  const handleEvent = (
    eventName: string,
    messageEvent: MessageEvent<string>,
  ) => {
    const id = messageEvent.lastEventId;

    if (id) {
      lastEventId.value = id;
    }

    let data: unknown;

    try {
      data = JSON.parse(messageEvent.data);
    } catch {
      data = messageEvent.data;
    }

    onEvent({
      id,
      event: eventName,
      data,
    });
  };

  /**
   * 再接続のスケジュール
   */
  const scheduleReconnect = () => {
    if (retryCount >= maxRetries) {
      connectionState.value = 'disconnected';
      onError?.(new Error(`Max retries (${maxRetries}) exceeded`));

      return;
    }

    connectionState.value = 'reconnecting';
    const delay = Math.min(
      BASE_RECONNECT_DELAY * 2 ** retryCount,
      MAX_RECONNECT_DELAY,
    );
    retryCount++;

    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;

      if (
        currentSessionId !== null &&
        currentSessionId.length > 0 &&
        connectionState.value === 'reconnecting'
      ) {
        connectInternal(currentSessionId);
      }
    }, delay);
  };

  /**
   * 内部の接続処理
   * @param sessionId - セッション ID
   */
  const connectInternal = (sessionId: string) => {
    // 既存の接続を閉じる
    if (eventSource) {
      eventSource.close();
    }

    // NOTE: EventSource はブラウザが自動的に Last-Event-ID ヘッダーを送信するため
    // 再接続時に lastEventId を明示的に送る必要はない
    const urlBase = `${apiBase}/sessions/${sessionId}/stream`;
    const url =
      currentPlayerId !== null && currentPlayerId.length > 0
        ? `${urlBase}?player_id=${encodeURIComponent(currentPlayerId)}`
        : urlBase;

    connectionState.value =
      connectionState.value === 'reconnecting' ? 'reconnecting' : 'connecting';

    eventSource = new EventSource(url);

    eventSource.addEventListener('open', () => {
      const wasReconnecting = connectionState.value === 'reconnecting';
      connectionState.value = 'connected';
      retryCount = 0; // リトライカウントをリセット

      if (wasReconnecting && wasConnected) {
        onReconnect?.();
      }

      wasConnected = true;
    });

    eventSource.addEventListener('error', () => {
      onError?.(new Error('SSE connection error'));

      if (wasConnected) {
        // 接続済み状態からのエラーの場合は再接続を試みる
        scheduleReconnect();
      }
    });

    // イベントリスナーを登録
    for (const eventType of SSE_EVENT_TYPES) {
      eventSource.addEventListener(eventType, (event: MessageEvent<string>) => {
        handleEvent(eventType, event);
      });
    }
  };

  /**
   * SSE 接続を開始する
   * @param sessionId - 接続先のセッション ID
   * @param playerId - 接続するプレイヤー ID（オプション）。指定すると切断時にロビーから自動退出
   */
  const connect = (sessionId: string, playerId?: string) => {
    // sessionId が空の場合は接続しない
    if (!sessionId) {
      return;
    }

    currentSessionId = sessionId;
    currentPlayerId = playerId ?? null;
    wasConnected = false;
    retryCount = 0;
    connectInternal(sessionId);
  };

  /**
   * SSE 接続を切断する
   */
  const disconnect = () => {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    currentSessionId = null;
    currentPlayerId = null;
    connectionState.value = 'disconnected';
  };

  return {
    connect,
    disconnect,
    connectionState,
    lastEventId,
  };
};
