import {
  type LogFunction,
  type MonitoringService,
  createMonitoringService,
} from 'services/monitoringService.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MonitoringService', () => {
  let mockLogger: ReturnType<typeof vi.fn<LogFunction>>;
  let service: MonitoringService;

  beforeEach(() => {
    mockLogger = vi.fn<LogFunction>();
    service = createMonitoringService({ log: mockLogger });
  });

  describe('logActionProcessing', () => {
    it('アクション処理時間を構造化ログとして記録する', () => {
      service.logActionProcessing({
        sessionId: 'session-1',
        commandId: 'cmd-1',
        action: 'placeChip',
        playerId: 'player-1',
        durationMs: 42,
        result: 'success',
        version: 'abc123',
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'action_processing',
        sessionId: 'session-1',
        commandId: 'cmd-1',
        action: 'placeChip',
        playerId: 'player-1',
        action_processing_ms: 42,
        result: 'success',
        version: 'abc123',
      });
    });

    it('失敗時はエラーコードを含めて記録する', () => {
      service.logActionProcessing({
        sessionId: 'session-1',
        commandId: 'cmd-2',
        action: 'takeCard',
        playerId: 'player-1',
        durationMs: 15,
        result: 'error',
        errorCode: 'STATE_VERSION_MISMATCH',
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'warn',
        event: 'action_processing',
        sessionId: 'session-1',
        commandId: 'cmd-2',
        action: 'takeCard',
        playerId: 'player-1',
        action_processing_ms: 15,
        result: 'error',
        errorCode: 'STATE_VERSION_MISMATCH',
      });
    });
  });

  describe('logMutexWait', () => {
    it('ミューテックス待ち時間を記録する', () => {
      service.logMutexWait({
        sessionId: 'session-1',
        waitMs: 25,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'debug',
        event: 'mutex_wait',
        sessionId: 'session-1',
        mutex_wait_ms: 25,
      });
    });
  });

  describe('logSseConnectionChange', () => {
    it('SSE 接続数の変化を記録する', () => {
      service.logSseConnectionChange({
        sessionId: 'session-1',
        action: 'connect',
        connectionCount: 5,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'sse_connection_change',
        sessionId: 'session-1',
        action: 'connect',
        sse_connection_count: 5,
      });
    });

    it('切断時も接続数を記録する', () => {
      service.logSseConnectionChange({
        sessionId: 'session-1',
        action: 'disconnect',
        connectionCount: 3,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'sse_connection_change',
        sessionId: 'session-1',
        action: 'disconnect',
        sse_connection_count: 3,
      });
    });
  });

  describe('logTimerEvent', () => {
    it('タイマー登録を監査ログに記録する', () => {
      service.logTimerEvent({
        sessionId: 'session-1',
        action: 'register',
        deadline: '2025-11-25T12:00:00.000Z',
        turn: 5,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'timer_event',
        sessionId: 'session-1',
        action: 'register',
        deadline: '2025-11-25T12:00:00.000Z',
        turn: 5,
      });
    });

    it('タイマー解除を監査ログに記録する', () => {
      service.logTimerEvent({
        sessionId: 'session-1',
        action: 'clear',
        turn: 5,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'timer_event',
        sessionId: 'session-1',
        action: 'clear',
        turn: 5,
      });
    });
  });

  describe('logExport', () => {
    it('エクスポート成功を監査ログに記録する', () => {
      service.logExport({
        sessionId: 'session-1',
        format: 'csv',
        entryCount: 42,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'export_success',
        sessionId: 'session-1',
        format: 'csv',
        entryCount: 42,
      });
    });

    it('JSON形式のエクスポートも記録する', () => {
      service.logExport({
        sessionId: 'session-1',
        format: 'json',
        entryCount: 100,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'export_success',
        sessionId: 'session-1',
        format: 'json',
        entryCount: 100,
      });
    });
  });

  describe('logSessionEvent', () => {
    it('セッションイベントを記録する', () => {
      service.logSessionEvent({
        sessionId: 'session-1',
        action: 'created',
        playerCount: 4,
      });

      expect(mockLogger).toHaveBeenCalledWith({
        level: 'info',
        event: 'session_event',
        sessionId: 'session-1',
        action: 'created',
        playerCount: 4,
      });
    });
  });
});
