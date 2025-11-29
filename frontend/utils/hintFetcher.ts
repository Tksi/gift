import { fetcher } from './fetcher';

/** ヒントデータの型 */
export type RuleHint = {
  text: string;
  emphasis: 'info' | 'warning';
  turn: number;
  generated_at: string;
};

/** ヒント取得成功時のレスポンスデータ */
export type HintSuccessData = {
  session_id: string;
  state_version: string;
  generated_from_version: string;
  hint: RuleHint;
};

/** ヒント取得結果 */
export type FetchHintResult =
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
      data: HintSuccessData;
    };

/**
 * ルールヒントを取得する
 * @param sessionId セッション ID
 * @returns 取得結果
 */
export const fetchHint = async (
  sessionId: string,
): Promise<FetchHintResult> => {
  try {
    const response = await fetcher.sessions[':sessionId'].hint.$get({
      param: { sessionId },
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
    };
  } catch {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }
};
