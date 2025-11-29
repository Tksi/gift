export type LogFunction = (entry: Record<string, unknown>) => void;

export type MonitoringDependencies = {
  log: LogFunction;
};

type ActionProcessingParams = {
  sessionId: string;
  commandId: string;
  action: string;
  playerId: string;
  durationMs: number;
  result: 'error' | 'success';
  version?: string;
  errorCode?: string;
};

type MutexWaitParams = {
  sessionId: string;
  waitMs: number;
};

type SseConnectionChangeParams = {
  sessionId: string;
  action: 'connect' | 'disconnect';
  connectionCount: number;
};

type TimerEventParams = {
  sessionId: string;
  action: 'clear' | 'register';
  deadline?: string;
  turn?: number;
};

type ExportParams = {
  sessionId: string;
  format: 'csv' | 'json';
  entryCount: number;
};

type SessionEventParams = {
  sessionId: string;
  action: string;
  playerCount?: number;
};

export type MonitoringService = {
  logActionProcessing: (params: ActionProcessingParams) => void;
  logMutexWait: (params: MutexWaitParams) => void;
  logSseConnectionChange: (params: SseConnectionChangeParams) => void;
  logTimerEvent: (params: TimerEventParams) => void;
  logExport: (params: ExportParams) => void;
  logSessionEvent: (params: SessionEventParams) => void;
};

/**
 * 構造化ログを出力するモニタリングサービスを構築する。
 * @param dependencies ログ関数を含む依存性。
 */
export const createMonitoringService = (
  dependencies: MonitoringDependencies,
): MonitoringService => {
  const logActionProcessing = (params: ActionProcessingParams): void => {
    const level = params.result === 'success' ? 'info' : 'warn';
    const entry: Record<string, unknown> = {
      level,
      event: 'action_processing',
      sessionId: params.sessionId,
      commandId: params.commandId,
      action: params.action,
      playerId: params.playerId,
      action_processing_ms: params.durationMs,
      result: params.result,
    };

    if (params.version !== undefined) {
      entry.version = params.version;
    }

    if (params.errorCode !== undefined) {
      entry.errorCode = params.errorCode;
    }

    dependencies.log(entry);
  };

  const logMutexWait = (params: MutexWaitParams): void => {
    dependencies.log({
      level: 'debug',
      event: 'mutex_wait',
      sessionId: params.sessionId,
      mutex_wait_ms: params.waitMs,
    });
  };

  const logSseConnectionChange = (params: SseConnectionChangeParams): void => {
    dependencies.log({
      level: 'info',
      event: 'sse_connection_change',
      sessionId: params.sessionId,
      action: params.action,
      sse_connection_count: params.connectionCount,
    });
  };

  const logTimerEvent = (params: TimerEventParams): void => {
    const entry: Record<string, unknown> = {
      level: 'info',
      event: 'timer_event',
      sessionId: params.sessionId,
      action: params.action,
    };

    if (params.deadline !== undefined) {
      entry.deadline = params.deadline;
    }

    if (params.turn !== undefined) {
      entry.turn = params.turn;
    }

    dependencies.log(entry);
  };

  const logExport = (params: ExportParams): void => {
    dependencies.log({
      level: 'info',
      event: 'export_success',
      sessionId: params.sessionId,
      format: params.format,
      entryCount: params.entryCount,
    });
  };

  const logSessionEvent = (params: SessionEventParams): void => {
    const entry: Record<string, unknown> = {
      level: 'info',
      event: 'session_event',
      sessionId: params.sessionId,
      action: params.action,
    };

    if (params.playerCount !== undefined) {
      entry.playerCount = params.playerCount;
    }

    dependencies.log(entry);
  };

  return {
    logActionProcessing,
    logMutexWait,
    logSseConnectionChange,
    logTimerEvent,
    logExport,
    logSessionEvent,
  };
};
