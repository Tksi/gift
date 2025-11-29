import { fetcher } from './fetcher';

/** スコア配置の型 */
export type ScorePlacement = {
  rank: number;
  playerId: string;
  score: number;
  chipsRemaining: number;
  cards: number[];
  cardSets: number[][];
};

/** タイブレーク情報の型 */
export type TieBreak = {
  reason: 'chipCount';
  tiedScore: number;
  contenders: string[];
  winner: string | null;
};

/** ゲーム結果の型 */
export type GameResults = {
  placements: ScorePlacement[];
  tieBreak: TieBreak | null;
};

/** イベントログエントリの型 */
export type EventLogEntry = {
  id: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  chipsDelta?: number | undefined;
  details?: Record<string, unknown> | undefined;
};

/** 結果取得成功時のレスポンスデータ */
export type ResultsSuccessData = {
  session_id: string;
  final_results: GameResults;
};

/** 結果取得結果 */
export type FetchResultsResult =
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
      data: ResultsSuccessData;
    };

/**
 * ゲーム結果を取得する
 * @param sessionId - セッション ID
 * @returns 取得結果
 */
export const fetchResults = async (
  sessionId: string,
): Promise<FetchResultsResult> => {
  try {
    const response = await fetcher.sessions[':sessionId'].results.$get({
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
