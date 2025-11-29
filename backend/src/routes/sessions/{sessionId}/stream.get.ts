import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';
import { respondNotFound } from 'routes/sessions/shared.js';
import { errorResponseSchema } from 'schema/sessions.js';
import type { SessionEnv } from 'routes/sessions/types.js';
import type { SseEventPayload } from 'services/sseBroadcastGateway.js';

const KEEP_ALIVE_INTERVAL_MS = 15_000;

/**
 * SSE ストリーム GET ルートの静的定義。
 */
export const sessionStreamGetRoute = createRoute({
  method: 'get',
  path: '/sessions/{sessionId}/stream',
  description:
    '指定したセッションの状態更新を SSE (Server-Sent Events) で購読します。`Last-Event-ID` を送ると未取得イベントを再送します。',
  request: {
    params: z.object({
      sessionId: z
        .string()
        .min(1)
        .describe(
          'SSE で監視する `session_id`。プレイヤー登録レスポンスで受け取った値を指定します。',
        ),
    }),
  },
  responses: {
    200: {
      description:
        'SSE ストリームが確立され、`state.delta` や `state.final` などのイベントが配信されます。',
    },
    404: {
      description: 'セッションが見つかりません。',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const formatPayload = (event: SseEventPayload) => ({
  id: event.id,
  event: event.event,
  data: event.data,
});

/**
 * SSE ストリーム GET ルートを持つ Hono アプリケーション。
 */
export const sessionStreamGetApp = new OpenAPIHono<SessionEnv>().openapi(
  sessionStreamGetRoute,
  (c) => {
    const deps = c.var.deps;
    const { sessionId } = c.req.valid('param');
    const envelope = deps.store.getEnvelope(sessionId);

    if (!envelope) {
      return respondNotFound(c, 'SESSION_NOT_FOUND', 'Session does not exist.');
    }

    const lastEventIdHeader = c.req.header('last-event-id');
    let connection: { disconnect: () => void } | null = null;
    let keepAliveHandle: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (keepAliveHandle) {
        clearInterval(keepAliveHandle);
        keepAliveHandle = null;
      }

      if (connection) {
        connection.disconnect();
        connection = null;
      }
    };

    return streamSSE(
      c,
      async (stream) => {
        const send = (event: SseEventPayload) => {
          void stream.writeSSE(formatPayload(event));
        };

        const connectOptions: Parameters<typeof deps.sseGateway.connect>[0] = {
          sessionId,
          send,
        };

        if (
          typeof lastEventIdHeader === 'string' &&
          lastEventIdHeader.length > 0
        ) {
          connectOptions.lastEventId = lastEventIdHeader;
        }

        connection = deps.sseGateway.connect(connectOptions);

        keepAliveHandle = setInterval(() => {
          void stream.write(': keep-alive\n\n');
        }, KEEP_ALIVE_INTERVAL_MS);

        await new Promise<void>((resolve) => {
          stream.onAbort(() => {
            cleanup();
            resolve();
          });
        });
      },
      async (err, stream) => {
        cleanup();
        console.error(err);
        await stream.write(': error\n\n');
      },
    );
  },
);
