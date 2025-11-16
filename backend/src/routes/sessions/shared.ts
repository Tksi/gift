import { createErrorResponseBody } from 'services/errors.js';
import type { Context } from 'hono';
import type { SessionEnvelope } from 'states/inMemoryGameStore.js';

/**
 * セッションエンベロープを API レスポンス形式へ整形する。
 * @param envelope ストアに保存されたセッション情報。
 */
export const toSessionResponse = (envelope: SessionEnvelope) => ({
  session_id: envelope.snapshot.sessionId,
  state_version: envelope.version,
  state: envelope.snapshot,
});

/**
 * バリデーションエラーを 422 レスポンスとして返送する。
 * @param c Hono コンテキスト。
 * @param code エラーコード。
 * @param message 詳細メッセージ。
 */
export const respondValidationError = (
  c: Context,
  code: string,
  message: string,
) =>
  c.json(
    createErrorResponseBody({
      code,
      message,
      status: 422,
    }),
    422,
  );

/**
 * リソースが見つからなかった場合に 404 レスポンスを返す。
 * @param c Hono コンテキスト。
 * @param code エラーコード。
 * @param message 詳細メッセージ。
 */
export const respondNotFound = (c: Context, code: string, message: string) =>
  c.json(
    createErrorResponseBody({
      code,
      message,
      status: 404,
    }),
    404,
  );
