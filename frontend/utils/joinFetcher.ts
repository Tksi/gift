import { fetcher } from './fetcher';
import type { GameStateData } from './stateFetcher';

/** 参加成功時のレスポンスデータ */
export type JoinSuccessData = {
  session_id: string;
  state_version: string;
  state: GameStateData;
  /** 参加したプレイヤー情報 */
  player: {
    id: string;
    displayName: string;
  };
};

/** 参加結果 */
export type JoinSessionResult =
  | {
      /** 失敗フラグ */
      success: false;
      /** エラーコード */
      code: string;
      /** HTTP ステータスコード */
      status: number;
    }
  | {
      /** 成功フラグ */
      success: true;
      /** レスポンスデータ */
      data: JoinSuccessData;
    };

/**
 * セッションに参加する
 * @param sessionId - セッション ID
 * @param displayName - 表示名
 * @returns 参加結果
 */
export const joinSession = async (
  sessionId: string,
  displayName: string,
): Promise<JoinSessionResult> => {
  // プレイヤー ID を自動生成（タイムスタンプ + ランダム文字列）
  const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const response = await fetcher.sessions[':sessionId'].join.$post({
      param: { sessionId },
      json: {
        player_id: playerId,
        display_name: displayName,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as Omit<JoinSuccessData, 'player'>;

      return {
        success: true,
        data: {
          ...data,
          player: {
            id: playerId,
            displayName,
          },
        },
      };
    }

    const errorData = (await response.json()) as { error?: { code: string } };
    const code = errorData.error?.code ?? 'UNKNOWN_ERROR';

    return {
      success: false,
      code,
      status: response.status,
    };
  } catch {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }
};
