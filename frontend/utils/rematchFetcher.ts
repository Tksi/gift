import { fetcher } from './fetcher';
import type { GameStateData } from './stateFetcher';

/** 再戦成功時のレスポンスデータ */
export type RematchSuccessData = {
  session_id: string;
  state_version: string;
  state: GameStateData;
};

/** 再戦結果 */
export type RematchResult =
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
      data: RematchSuccessData;
    };

/**
 * 再戦を開始する（同じセッション内で新しいゲームを開始）
 * @param sessionId - セッション ID
 * @returns 再戦結果
 */
export const startRematch = async (
  sessionId: string,
): Promise<RematchResult> => {
  try {
    const response = await fetcher.sessions[':sessionId'].rematch.$post({
      param: { sessionId },
    });

    if (response.ok) {
      const data = (await response.json()) as RematchSuccessData;

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
