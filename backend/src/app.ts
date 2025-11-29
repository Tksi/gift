import { randomUUID } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { sessionsListGetApp } from 'routes/sessions/index.get.js';
import { sessionPostApp } from 'routes/sessions/index.post.js';
import { createSessionDepsMiddleware } from 'routes/sessions/types.js';
import { sessionActionsPostApp } from 'routes/sessions/{sessionId}/actions.post.js';
import { sessionGetApp } from 'routes/sessions/{sessionId}/index.get.js';
import { sessionJoinPostApp } from 'routes/sessions/{sessionId}/join.post.js';
import { logsExportCsvGetApp } from 'routes/sessions/{sessionId}/logs/export.csv.get.js';
import { logsExportJsonGetApp } from 'routes/sessions/{sessionId}/logs/export.json.get.js';
import { sessionRematchPostApp } from 'routes/sessions/{sessionId}/rematch.post.js';
import { sessionResultsGetApp } from 'routes/sessions/{sessionId}/results.get.js';
import { sessionStartPostApp } from 'routes/sessions/{sessionId}/start.post.js';
import { sessionStateGetApp } from 'routes/sessions/{sessionId}/state.get.js';
import { sessionStreamGetApp } from 'routes/sessions/{sessionId}/stream.get.js';
import {
  type EventLogService,
  createEventLogService,
} from 'services/eventLogService.js';
import {
  type MonitoringService,
  createMonitoringService,
} from 'services/monitoringService.js';
import {
  type SseBroadcastGateway,
  createSseBroadcastGateway,
} from 'services/sseBroadcastGateway.js';
import {
  type TimerSupervisor,
  createTimerSupervisor,
} from 'services/timerSupervisor.js';
import { createTurnDecisionService } from 'services/turnDecision.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import type {
  SessionEnv,
  SessionRouteDependencies,
} from 'routes/sessions/types.js';
import type { InMemoryGameStore } from 'states/inMemoryGameStore.js';

export type CreateAppOptions = {
  store?: InMemoryGameStore;
  now?: () => string;
  generateSessionId?: () => string;
  timerSupervisor?: TimerSupervisor;
  turnTimeoutMs?: number;
  sseGateway?: SseBroadcastGateway;
  eventLogService?: EventLogService;
  monitoring?: MonitoringService;
};

/**
 * console.info で構造化ログを出力するデフォルトロガー。
 * @param entry ログエントリ。
 */
const defaultLogger = (entry: Record<string, unknown>): void => {
  console.info(JSON.stringify(entry));
};

/**
 * 共通ミドルウェアやドキュメント、ルートをまとめた API アプリケーションを構築する。
 * @param options ストアやクロック、ID 生成器などを差し替えるためのオプション。
 */
export const createApp = (options: CreateAppOptions = {}) => {
  const store = options.store ?? createInMemoryGameStore();
  const now = options.now ?? (() => new Date().toISOString());
  const generateSessionId = options.generateSessionId ?? (() => randomUUID());
  const turnTimeoutMs = options.turnTimeoutMs ?? 45_000;
  const monitoring =
    options.monitoring ?? createMonitoringService({ log: defaultLogger });
  const sseGateway =
    options.sseGateway ?? createSseBroadcastGateway({ monitoring });
  const eventLogService =
    options.eventLogService ??
    createEventLogService({
      store,
      sseGateway,
    });
  const timerSupervisor =
    options.timerSupervisor ??
    createTimerSupervisor({
      store,
      now: () => Date.now(),
      schedule: (handler, delay) => setTimeout(handler, delay),
      cancel: (handle) => clearTimeout(handle),
      monitoring,
    });

  const turnService = createTurnDecisionService({
    store,
    now,
    timerSupervisor,
    turnTimeoutMs,
    eventLogs: eventLogService,
    monitoring,
  });

  const sessionDependencies: SessionRouteDependencies = {
    store,
    now,
    generateSessionId,
    turnService,
    timerSupervisor,
    turnTimeoutMs,
    sseGateway,
    eventLogService,
    monitoring,
  };

  timerSupervisor.restore();

  // 依存注入ミドルウェアを /sessions* パスに適用
  const app = new OpenAPIHono<SessionEnv>();
  app.use('*', cors());
  app.use('/sessions/*', createSessionDepsMiddleware(sessionDependencies));
  app.use('/sessions', createSessionDepsMiddleware(sessionDependencies));

  // app.route() でサブアプリをマウントして型を保持
  const routes = app
    .route('/', sessionPostApp)
    .route('/', sessionsListGetApp)
    .route('/', sessionGetApp)
    .route('/', sessionStateGetApp)
    .route('/', sessionStreamGetApp)
    .route('/', sessionActionsPostApp)
    .route('/', sessionResultsGetApp)
    .route('/', sessionJoinPostApp)
    .route('/', sessionStartPostApp)
    .route('/', sessionRematchPostApp)
    .route('/', logsExportCsvGetApp)
    .route('/', logsExportJsonGetApp)
    .doc('/doc', {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'API ドキュメント',
      },
    })
    .get('/scalar', Scalar({ url: '/doc' }));

  return routes;
};

// hc クライアント生成のための型エクスポート
export type AppType = ReturnType<typeof createApp>;
