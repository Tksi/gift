import { fetcher } from './fetcher';

/** ゲーム状態の型（バックエンド API レスポンスから推論） */
export type GameStateData = {
  sessionId: string;
  phase: 'completed' | 'running' | 'setup' | 'waiting';
  deck: number[];
  discardHidden: number[];
  playerOrder: string[];
  rngSeed: string;
  players: { id: string; displayName: string }[];
  chips: Record<string, number>;
  hands: Record<string, number[]>;
  centralPot: number;
  turnState: {
    turn: number;
    currentPlayerId: string;
    currentPlayerIndex: number;
    cardInCenter: number | null;
    awaitingAction: boolean;
    deadline?: string | null;
  };
  createdAt: string;
  updatedAt: string;
  finalResults: {
    placements: {
      rank: number;
      playerId: string;
      score: number;
      chipsRemaining: number;
      cards: number[];
      cardSets: number[][];
    }[];
    tieBreak: {
      reason: 'chipCount';
      tiedScore: number;
      contenders: string[];
      winner: string | null;
    } | null;
  } | null;
  maxPlayers: number;
};

/** 状態取得成功時のレスポンスデータ */
export type StateSuccessData = {
  session_id: string;
  state_version: string;
  state: GameStateData;
};

/** 状態取得結果 */
export type FetchStateResult =
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
      data: StateSuccessData;
    };

/**
 * ゲーム状態を取得する
 * @param sessionId - セッション ID
 * @returns 取得結果
 */
export const fetchState = async (
  sessionId: string,
): Promise<FetchStateResult> => {
  try {
    const response = await fetcher.sessions[':sessionId'].state.$get({
      param: { sessionId },
    });

    if (response.ok) {
      const data = (await response.json()) as StateSuccessData;

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
