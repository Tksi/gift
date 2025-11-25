import { type Ref, ref } from 'vue';

/**
 * ゲームフェーズを表す型
 */
export type GamePhase = 'completed' | 'running' | 'setup';

/**
 * プレイヤー情報
 */
export type Player = {
  id: string;
  displayName: string;
};

/**
 * ターン状態
 */
export type TurnState = {
  turn: number;
  currentPlayerId: string;
  currentPlayerIndex: number;
  cardInCenter: number | null;
  awaitingAction: boolean;
  deadline?: string | null;
};

/**
 * スコア配置（結果）
 */
export type Placement = {
  rank: number;
  playerId: string;
  score: number;
  chipsRemaining: number;
  cards: number[];
  cardSets: number[][];
};

/**
 * タイブレーク情報
 */
export type TieBreak = {
  reason: 'chipCount';
  tiedScore: number;
  contenders: string[];
  winner: string | null;
};

/**
 * 最終結果サマリー
 */
export type ScoreSummary = {
  placements: Placement[];
  tieBreak: TieBreak | null;
};

/**
 * ゲームスナップショット（バックエンドから受信）
 */
export type GameSnapshot = {
  sessionId: string;
  phase: GamePhase;
  deck: number[];
  discardHidden: number[];
  playerOrder: string[];
  rngSeed: string;
  players: Player[];
  chips: Record<string, number>;
  hands: Record<string, number[]>;
  centralPot: number;
  turnState: TurnState;
  createdAt: string;
  updatedAt: string;
  finalResults: ScoreSummary | null;
};

/**
 * イベントログエントリ
 */
export type EventLogEntry = {
  id: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  chipsDelta?: number;
  details?: Record<string, unknown>;
};

/**
 * SSE接続状態を表す型
 */
export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'reconnecting';

/**
 * RuleHintの強調度
 */
export type RuleHintEmphasis = 'info' | 'warning';

/**
 * ルールヒント（フロントエンド用に整形済み）
 */
export type RuleHint = {
  text: string;
  emphasis: RuleHintEmphasis;
  turn: number;
  generatedAt: string;
};

/**
 * システムエラー情報
 */
export type SystemError = {
  code: string;
  message: string;
};

/**
 * useGameStreamのオプション
 */
export type UseGameStreamOptions = {
  sessionId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
};

/**
 * useGameStreamの戻り値
 */
export type UseGameStreamReturn = {
  /** 接続状態 */
  status: Ref<ConnectionStatus>;
  /** 接続開始 */
  connect: () => void;
  /** 接続終了 */
  disconnect: () => void;
  /** 最後に受信したイベント ID */
  lastEventId: Ref<string | null>;
  /** 現在のゲーム状態（リアクティブ） */
  gameState: Ref<GameSnapshot | null>;
  /** 状態バージョン（楽観的排他制御用） */
  stateVersion: Ref<string | null>;
  /** イベントログ */
  eventLog: Ref<EventLogEntry[]>;
  /** 最終結果（ゲーム終了時） */
  finalResults: Ref<GameSnapshot['finalResults'] | null>;
  /** 現在のヒント */
  currentHint: Ref<RuleHint | null>;
  /** 最新のシステムエラー */
  lastSystemError: Ref<SystemError | null>;
};

/** 再接続の最大試行回数 */
const MAX_RECONNECT_ATTEMPTS = 5;

/** SSEイベントタイプ */
const SSE_EVENTS = {
  STATE_DELTA: 'state.delta',
  STATE_FINAL: 'state.final',
  EVENT_LOG: 'event.log',
  RULE_HINT: 'rule.hint',
  SYSTEM_ERROR: 'system.error',
} as const;

/**
 * SSE接続を管理し、リアルタイムでゲーム状態を受信・保持するComposable
 * @param options - 接続オプション
 * @returns SSE接続と状態管理のインターフェース
 */
export const useGameStream = (
  options: UseGameStreamOptions,
): UseGameStreamReturn => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase;

  // 接続状態
  const status = ref<ConnectionStatus>('disconnected');
  const lastEventId = ref<string | null>(null);

  // ゲーム状態
  const gameState = ref<GameSnapshot | null>(null);
  const stateVersion = ref<string | null>(null);
  const eventLog = ref<EventLogEntry[]>([]);
  const finalResults = ref<GameSnapshot['finalResults'] | null>(null);
  const currentHint = ref<RuleHint | null>(null);
  const lastSystemError = ref<SystemError | null>(null);

  // 内部状態
  let eventSource: EventSource | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * SSE接続を確立する
   */
  const connect = (): void => {
    if (eventSource !== null) {
      return;
    }

    status.value = 'connecting';

    const streamUrl = `${String(baseUrl)}/sessions/${options.sessionId}/stream`;
    eventSource = new EventSource(streamUrl);

    // 接続成功時
    eventSource.addEventListener('open', (): void => {
      status.value = 'connected';
      reconnectAttempts = 0;
      options.onConnect?.();
    });

    // エラー時
    eventSource.addEventListener('error', (event: Event): void => {
      options.onError?.(event);

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        status.value = 'disconnected';
        cleanup();

        return;
      }

      status.value = 'reconnecting';
      cleanup();
      scheduleReconnect();
    });

    // イベントリスナーを登録
    registerEventListeners(eventSource);
  };

  /**
   * SSE接続を切断する
   */
  const disconnect = (): void => {
    cleanup();
    status.value = 'disconnected';
    options.onDisconnect?.();
  };

  /**
   * EventSourceのクリーンアップ
   */
  const cleanup = (): void => {
    if (reconnectTimeoutId !== null) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }

    if (eventSource !== null) {
      eventSource.close();
      eventSource = null;
    }
  };

  /**
   * 再接続をスケジュールする（exponential backoff）
   */
  const scheduleReconnect = (): void => {
    const backoffMs = Math.pow(2, reconnectAttempts) * 1000;
    reconnectAttempts += 1;

    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      connect();
    }, backoffMs);
  };

  /**
   * SSEイベントリスナーを登録する
   * @param es - EventSourceインスタンス
   */
  const registerEventListeners = (es: EventSource): void => {
    // state.delta イベント
    es.addEventListener(SSE_EVENTS.STATE_DELTA, (event: MessageEvent) => {
      handleStateDelta(event);
    });

    // state.final イベント
    es.addEventListener(SSE_EVENTS.STATE_FINAL, (event: MessageEvent) => {
      handleStateFinal(event);
    });

    // event.log イベント
    es.addEventListener(SSE_EVENTS.EVENT_LOG, (event: MessageEvent) => {
      handleEventLog(event);
    });

    // rule.hint イベント
    es.addEventListener(SSE_EVENTS.RULE_HINT, (event: MessageEvent) => {
      handleRuleHint(event);
    });

    // system.error イベント
    es.addEventListener(SSE_EVENTS.SYSTEM_ERROR, (event: MessageEvent) => {
      handleSystemError(event);
    });
  };

  /**
   * state.delta イベントを処理する
   * @param event - SSEメッセージイベント
   */
  const handleStateDelta = (event: MessageEvent): void => {
    const data = JSON.parse(event.data as string) as {
      session_id: string;
      state_version: string;
      state: GameSnapshot;
    };

    gameState.value = data.state;
    stateVersion.value = data.state_version;
    updateLastEventId(event.lastEventId);
  };

  /**
   * state.final イベントを処理する
   * @param event - SSEメッセージイベント
   */
  const handleStateFinal = (event: MessageEvent): void => {
    const data = JSON.parse(event.data as string) as {
      session_id: string;
      state_version: string;
      final_results: GameSnapshot['finalResults'];
    };

    finalResults.value = data.final_results;
    updateLastEventId(event.lastEventId);
  };

  /**
   * event.log イベントを処理する
   * @param event - SSEメッセージイベント
   */
  const handleEventLog = (event: MessageEvent): void => {
    const entry = JSON.parse(event.data as string) as EventLogEntry;
    eventLog.value = [...eventLog.value, entry];
    updateLastEventId(event.lastEventId);
  };

  /**
   * rule.hint イベントを処理する
   * @param event - SSEメッセージイベント
   */
  const handleRuleHint = (event: MessageEvent): void => {
    const data = JSON.parse(event.data as string) as {
      session_id: string;
      state_version: string;
      hint: {
        text: string;
        emphasis: RuleHintEmphasis;
        turn: number;
        generated_at: string;
      };
    };

    currentHint.value = {
      text: data.hint.text,
      emphasis: data.hint.emphasis,
      turn: data.hint.turn,
      generatedAt: data.hint.generated_at,
    };
    updateLastEventId(event.lastEventId);
  };

  /**
   * system.error イベントを処理する
   * @param event - SSEメッセージイベント
   */
  const handleSystemError = (event: MessageEvent): void => {
    const data = JSON.parse(event.data as string) as {
      session_id: string;
      error: SystemError;
    };

    lastSystemError.value = data.error;
    updateLastEventId(event.lastEventId);
  };

  /**
   * lastEventId を更新する
   * @param eventId - イベントID
   */
  const updateLastEventId = (eventId: string): void => {
    if (eventId) {
      lastEventId.value = eventId;
    }
  };

  return {
    status,
    connect,
    disconnect,
    lastEventId,
    gameState,
    stateVersion,
    eventLog,
    finalResults,
    currentHint,
    lastSystemError,
  };
};
