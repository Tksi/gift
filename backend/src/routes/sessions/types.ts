import { createMiddleware } from 'hono/factory';
import type { EventLogService } from 'services/eventLogService.js';
import type { MonitoringService } from 'services/monitoringService.js';
import type { RuleHintService } from 'services/ruleHintService.js';
import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type { TimerSupervisor } from 'services/timerSupervisor.js';
import type { TurnDecisionService } from 'services/turnDecision.js';
import type { InMemoryGameStore } from 'states/inMemoryGameStore.js';

export type SessionRouteDependencies = {
  store: InMemoryGameStore;
  now: () => string;
  generateSessionId: () => string;
  turnService: TurnDecisionService;
  timerSupervisor: TimerSupervisor;
  turnTimeoutMs: number;
  sseGateway: SseBroadcastGateway;
  eventLogService: EventLogService;
  ruleHintService: RuleHintService;
  monitoring?: MonitoringService;
};

/**
 * 依存を c.var に注入するミドルウェアの環境型。
 */
export type SessionEnv = {
  Variables: {
    deps: SessionRouteDependencies;
  };
};

/**
 * 依存注入ミドルウェアを生成するファクトリ。
 * app.use() で使用する。
 * @param deps セッションルートに必要な依存オブジェクト。
 */
export const createSessionDepsMiddleware = (deps: SessionRouteDependencies) =>
  createMiddleware<SessionEnv>(async (c, next) => {
    c.set('deps', deps);
    await next();
  });
