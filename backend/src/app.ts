import { randomUUID } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { sessionPostApp } from 'routes/sessions/index.post.js';
import { createSessionDepsMiddleware } from 'routes/sessions/types.js';
import { sessionActionsPostApp } from 'routes/sessions/{sessionId}/actions.post.js';
import { sessionHintGetApp } from 'routes/sessions/{sessionId}/hint.get.js';
import { sessionGetApp } from 'routes/sessions/{sessionId}/index.get.js';
import { logsExportCsvGetApp } from 'routes/sessions/{sessionId}/logs/export.csv.get.js';
import { logsExportJsonGetApp } from 'routes/sessions/{sessionId}/logs/export.json.get.js';
import { sessionResultsGetApp } from 'routes/sessions/{sessionId}/results.get.js';
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
  type RuleHintService,
  createRuleHintService,
} from 'services/ruleHintService.js';
import {
  type SseBroadcastGateway,
  createSseBroadcastGateway,
} from 'services/sseBroadcastGateway.js';
import { createTimeoutCommandHandler } from 'services/systemTimeoutHandler.js';
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
  ruleHintService?: RuleHintService;
  monitoring?: MonitoringService;
};

/**
 * console.info で構造化ログを出力するデフォルトロガー。
 * @param entry ログエントリ。
 */
const defaultLogger = (entry: Record<string, unknown>): void => {
  console.info(JSON.stringify(entry));
};

const noopTimeoutHandler = (): void => undefined;

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
  const ruleHintService =
    options.ruleHintService ??
    createRuleHintService({
      now,
    });
  const eventLogService =
    options.eventLogService ??
    createEventLogService({
      store,
      sseGateway,
    });
  let timeoutHandler: (sessionId: string) => Promise<void> | void =
    noopTimeoutHandler;
  const timerSupervisor =
    options.timerSupervisor ??
    createTimerSupervisor({
      store,
      now: () => Date.now(),
      schedule: (handler, delay) => setTimeout(handler, delay),
      cancel: (handle) => clearTimeout(handle),
      onTimeout: (sessionId) => timeoutHandler(sessionId),
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

  if (options.timerSupervisor === undefined) {
    timeoutHandler = createTimeoutCommandHandler({
      store,
      turnService,
      sseGateway,
      ruleHintService,
      monitoring,
    });
  }

  const sessionDependencies: SessionRouteDependencies = {
    store,
    now,
    generateSessionId,
    turnService,
    timerSupervisor,
    turnTimeoutMs,
    sseGateway,
    eventLogService,
    ruleHintService,
    monitoring,
  };

  timerSupervisor.restore();

  // 依存注入ミドルウェアを /sessions* パスに適用
  const app = new OpenAPIHono<SessionEnv>();
  app.use('/sessions/*', createSessionDepsMiddleware(sessionDependencies));
  app.use('/sessions', createSessionDepsMiddleware(sessionDependencies));

  // app.route() でサブアプリをマウントして型を保持
  const routes = app
    .route('/', sessionPostApp)
    .route('/', sessionGetApp)
    .route('/', sessionStateGetApp)
    .route('/', sessionHintGetApp)
    .route('/', sessionStreamGetApp)
    .route('/', sessionActionsPostApp)
    .route('/', sessionResultsGetApp)
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
