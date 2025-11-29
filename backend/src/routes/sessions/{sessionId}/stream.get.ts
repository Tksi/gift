import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';
import { respondNotFound } from 'routes/sessions/shared.js';
import { errorResponseSchema } from 'schema/sessions.js';
import { publishStateEvents } from 'services/ssePublisher.js';
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
    '指定したセッションの状態更新を SSE (Server-Sent Events) で購読します。`Last-Event-ID` を送ると未取得イベントを再送します。`player_id` を指定すると、切断時にロビー状態のセッションから自動的に退出します。',
  request: {
    params: z.object({
      sessionId: z
        .string()
        .min(1)
        .describe(
          'SSE で監視する `session_id`。プレイヤー登録レスポンスで受け取った値を指定します。',
        ),
    }),
    query: z.object({
      player_id: z
        .string()
        .optional()
        .describe(
          '接続するプレイヤーの ID。指定すると、切断時にロビー状態のセッションから自動退出します。',
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
    const query = c.req.valid('query');
    const playerId = query.player_id;
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

        /**
         * 切断時にロビー状態のセッションからプレイヤーを削除する
         * @param disconnectedSessionId - 切断されたセッションID
         * @param disconnectedPlayerId - 切断されたプレイヤーID（undefined の場合は何もしない）
         */
        const handleDisconnect = (
          disconnectedSessionId: string,
          disconnectedPlayerId: string | undefined,
        ) => {
          if (
            disconnectedPlayerId === undefined ||
            disconnectedPlayerId === ''
          ) {
            return;
          }

          const currentEnvelope = deps.store.getEnvelope(disconnectedSessionId);

          if (!currentEnvelope) {
            return;
          }

          const snapshot = currentEnvelope.snapshot;

          // ロビー状態（waiting）でない場合は何もしない
          if (snapshot.phase !== 'waiting') {
            return;
          }

          // プレイヤーがセッションに存在するか確認
          const playerExists = snapshot.players.some(
            (p) => p.id === disconnectedPlayerId,
          );

          if (!playerExists) {
            return;
          }

          // プレイヤーを削除
          const updatedSnapshot = {
            ...snapshot,
            players: snapshot.players.filter(
              (p) => p.id !== disconnectedPlayerId,
            ),
            updatedAt: deps.now(),
          };

          const updatedEnvelope = deps.store.saveSnapshot(updatedSnapshot);

          // 他の接続クライアントに変更を通知
          publishStateEvents(
            { sseGateway: deps.sseGateway },
            updatedEnvelope.snapshot,
            updatedEnvelope.version,
          );
        };

        const connectOptions: Parameters<typeof deps.sseGateway.connect>[0] = {
          sessionId,
          playerId,
          send,
          onDisconnect: handleDisconnect,
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
      async (_err, stream) => {
        cleanup();
        await stream.write(': error\n\n');
      },
    );
  },
);
