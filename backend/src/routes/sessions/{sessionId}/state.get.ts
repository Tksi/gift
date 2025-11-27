import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { respondNotFound, toSessionResponse } from 'routes/sessions/shared.js';
import { errorResponseSchema, sessionResponseSchema } from 'schema/sessions.js';
import type { SessionEnv } from 'routes/sessions/types.js';

/**
 * セッション状態取得 GET ルートの静的定義。
 */
export const sessionStateGetRoute = createRoute({
  method: 'get',
  path: '/sessions/{sessionId}/state',
  description:
    'セッションの最新スナップショットを取得し、ETag でクライアントのキャッシュバージョンと突き合わせます。',
  request: {
    params: z.object({
      sessionId: z
        .string()
        .min(1)
        .describe(
          '状態を取得する `session_id`。初期作成レスポンスで受け取った値を指定します。',
        ),
    }),
  },
  responses: {
    200: {
      description:
        'セッションが存在し、最新スナップショットとバージョンが返却されました。',
      content: {
        'application/json': {
          schema: sessionResponseSchema,
        },
      },
    },
    304: {
      description:
        '送信された `If-None-Match` が最新バージョンと一致したため、キャッシュ済みデータを再利用できます。',
    },
    404: {
      description: '指定された `session_id` のデータが存在しません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const formatEtag = (version: string): string => `"${version}"`;

const normalizeEtagToken = (token: string): string => {
  const trimmed = token.trim();

  if (trimmed.length === 0) {
    return '';
  }

  if (trimmed === '*') {
    return '*';
  }

  const withoutWeakPrefix = trimmed.startsWith('W/')
    ? trimmed.slice(2)
    : trimmed;

  if (
    withoutWeakPrefix.startsWith('"') &&
    withoutWeakPrefix.endsWith('"') &&
    withoutWeakPrefix.length >= 2
  ) {
    return withoutWeakPrefix.slice(1, -1);
  }

  return withoutWeakPrefix;
};

const parseIfNoneMatch = (headerValue: string | null): string[] => {
  if (headerValue === null) {
    return [];
  }

  if (headerValue.trim().length === 0) {
    return [];
  }

  return headerValue
    .split(',')
    .map((token) => normalizeEtagToken(token))
    .filter((token) => token.length > 0);
};

const isCachedVersionFresh = (
  ifNoneMatchHeader: string | null,
  version: string,
): boolean => {
  const tokens = parseIfNoneMatch(ifNoneMatchHeader);

  if (tokens.length === 0) {
    return false;
  }

  if (tokens.includes('*')) {
    return true;
  }

  return tokens.includes(version);
};

/**
 * セッション状態取得 GET ルートを持つ Hono アプリケーション。
 */
export const sessionStateGetApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionStateGetRoute,
  (c) => {
    const deps = c.var.deps;
    const { sessionId } = c.req.valid('param');
    const envelope = deps.store.getEnvelope(sessionId);

    if (!envelope) {
      return respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');
    }

    const etag = formatEtag(envelope.version);
    c.header('ETag', etag);

    const isFresh = isCachedVersionFresh(
      c.req.header('if-none-match') ?? null,
      envelope.version,
    );

    if (isFresh) {
      return c.body(null, 304);
    }

    return c.json(toSessionResponse(envelope), 200);
  },
);
