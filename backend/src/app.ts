import { randomUUID } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { registerSessionGetRoute } from 'routes/sessions/[sessionId]/index.get.js';
import { registerSessionPostRoute } from 'routes/sessions/index.post.js';
import { createInMemoryGameStore } from 'states/inMemoryGameStore.js';
import type { SessionRouteDependencies } from 'routes/sessions/types.js';
import type { InMemoryGameStore } from 'states/inMemoryGameStore.js';

export type CreateAppOptions = {
  store?: InMemoryGameStore;
  now?: () => string;
  generateSessionId?: () => string;
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

  const sessionsApp = new OpenAPIHono();
  const sessionDependencies: SessionRouteDependencies = {
    store,
    now,
    generateSessionId,
  };

  registerSessionPostRoute(sessionsApp, sessionDependencies);
  registerSessionGetRoute(sessionsApp, sessionDependencies);

  app.route('/', sessionsApp);

  app
    .doc('/doc', {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Geschenkt API ドキュメント',
      },
    })
    .get('/scalar', Scalar({ url: '/doc' }));

  return app;
};
