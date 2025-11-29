import { fetcher } from './fetcher';
import type { GameStateData } from './stateFetcher';

/** ゲーム開始成功時のレスポンスデータ */
export type StartSuccessData = {
  session_id: string;
  state_version: string;
  state: GameStateData;
};

/** ゲーム開始結果 */
export type StartGameResult =
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
      data: StartSuccessData;
    };

/**
 * ゲームを開始する
 * @param sessionId - セッション ID
 * @returns ゲーム開始結果
 */
export const startGame = async (
  sessionId: string,
): Promise<StartGameResult> => {
  try {
    const response = await fetcher.sessions[':sessionId'].start.$post({
      param: { sessionId },
    });

    if (response.ok) {
      const data = (await response.json()) as StartSuccessData;

      return { success: true, data };
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
