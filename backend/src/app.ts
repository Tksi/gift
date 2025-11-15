import { randomUUID } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { registerSessionPostRoute } from 'routes/sessions/index.post.js';
import { registerSessionActionsPostRoute } from 'routes/sessions/{sessionId}/actions.post.js';
import { registerSessionGetRoute } from 'routes/sessions/{sessionId}/index.get.js';
import { registerSessionStateGetRoute } from 'routes/sessions/{sessionId}/state.get.js';
import {
  type TimerSupervisor,
  createTimerSupervisor,
} from 'services/timerSupervisor.js';
import { createTurnDecisionService } from 'services/turnDecision.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';
import type { InMemoryGameStore } from 'states/inMemoryGameStore.js';

export type CreateAppOptions = {
  store?: InMemoryGameStore;
  now?: () => string;
  generateSessionId?: () => string;
  timerSupervisor?: TimerSupervisor;
  turnTimeoutMs?: number;
};

const noopTimeoutHandler = (): void => {
  // 強制取得フローは Task 3.2 で実装予定のため、現時点では no-op。
};

/**
 * 共通ミドルウェアやドキュメント、ルートをまとめた API アプリケーションを構築する。
 * @param options ストアやクロック、ID 生成器などを差し替えるためのオプション。
 */
export const createApp = (options: CreateAppOptions = {}) => {
  const app = new OpenAPIHono();

  const store = options.store ?? createInMemoryGameStore();
  const now = options.now ?? (() => new Date().toISOString());
  const generateSessionId = options.generateSessionId ?? (() => randomUUID());
  const turnTimeoutMs = options.turnTimeoutMs ?? 45_000;
  const timerSupervisor =
    options.timerSupervisor ??
    createTimerSupervisor({
      store,
      now: () => Date.now(),
      schedule: (handler, delay) => setTimeout(handler, delay),
      cancel: (handle) => clearTimeout(handle),
      onTimeout: noopTimeoutHandler,
    });

  const sessionsApp = new OpenAPIHono();
  const turnService = createTurnDecisionService({
    store,
    now,
    timerSupervisor,
    turnTimeoutMs,
  });
  const sessionDependencies: SessionRouteDependencies = {
    store,
    now,
    generateSessionId,
    turnService,
    timerSupervisor,
    turnTimeoutMs,
  };

  timerSupervisor.restore();

  registerSessionPostRoute(sessionsApp, sessionDependencies);
  registerSessionGetRoute(sessionsApp, sessionDependencies);
  registerSessionStateGetRoute(sessionsApp, sessionDependencies);
  registerSessionActionsPostRoute(sessionsApp, sessionDependencies);

  app.route('/', sessionsApp);

  app
    .doc('/doc', {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'API ドキュメント',
      },
    })
    .get('/scalar', Scalar({ url: '/doc' }));

  return app;
};
