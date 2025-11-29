import { fetcher } from './fetcher';
import type { InferResponseType } from 'hono/client';

/** アクション種別 */
export type ActionType = 'placeChip' | 'takeCard';

/** アクション送信パラメータ */
export type SendActionParams = {
  /** セッション ID */
  sessionId: string;
  /** コマンド ID（一意識別子） */
  commandId: string;
  /** 状態バージョン（楽観的ロック用） */
  stateVersion: string;
  /** プレイヤー ID */
  playerId: string;
  /** アクション種別 */
  action: ActionType;
};

/** アクション成功時のレスポンスデータ（200 レスポンス） */
export type ActionSuccessData = InferResponseType<
  (typeof fetcher.sessions)[':sessionId']['actions']['$post'],
  200
>;

/** アクション送信結果 */
export type SendActionResult =
  | {
      /** 失敗フラグ */
      success: false;
      /** エラーコード */
      code: string;
      /** HTTP ステータスコード */
      status: number;
      /** バージョン競合フラグ（409 エラー時） */
      isVersionConflict: boolean;
    }
  | {
      /** 成功フラグ */
      success: true;
      /** レスポンスデータ */
      data: ActionSuccessData;
    };

/**
 * ゲームアクションを送信する
 * @param params アクション送信パラメータ
 * @returns 送信結果
 */
export const sendAction = async (
  params: SendActionParams,
): Promise<SendActionResult> => {
  const { sessionId, commandId, stateVersion, playerId, action } = params;

  try {
    const response = await fetcher.sessions[':sessionId'].actions.$post({
      param: { sessionId },
      json: {
        command_id: commandId,
        state_version: stateVersion,
        player_id: playerId,
        action,
      },
    });

    if (response.ok) {
      const data = await response.json();

      return { success: true, data };
    }

    const errorData = await response.json();
    const code = 'error' in errorData ? errorData.error.code : 'UNKNOWN_ERROR';

    return {
      success: false,
      code,
      status: response.status,
      isVersionConflict: response.status === 409,
    };
  } catch {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      status: 0,
      isVersionConflict: false,
    };
  }
};

/**
 * 一意のコマンド ID を生成する
 * @returns コマンド ID
 */
export const generateCommandId = (): string => {
  return crypto.randomUUID();
};
