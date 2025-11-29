/**
 * バックエンド API のエラーコードから日本語メッセージへのマッピング
 */
const errorMessages: Record<string, string> = {
  SESSION_NOT_FOUND: 'セッションが見つかりません。',
  PLAYER_COUNT_INVALID: 'プレイヤー数は2〜7人である必要があります。',
  DUPLICATE_PLAYER_ID: 'プレイヤーIDが重複しています。',
  STATE_VERSION_MISMATCH: '状態が更新されました。再度お試しください。',
  RESULT_NOT_READY: 'ゲームがまだ終了していません。',
  CHIP_INSUFFICIENT: 'チップが不足しています。',
  TURN_NOT_AVAILABLE: 'あなたの手番ではありません。',
  GAME_ALREADY_COMPLETED: 'このゲームは既に終了しています。',
  PLAYER_NOT_FOUND: '指定されたプレイヤーが見つかりません。',
  PLAYER_ORDER_INVALID: 'プレイヤー順序が不正です。',
  NETWORK_ERROR: 'ネットワーク接続を確認してください。',
  SESSION_NOT_JOINABLE: 'このセッションは参加受付を終了しています。',
  SESSION_FULL: 'セッションが満員です。',
  PLAYER_ID_NOT_UNIQUE: 'このプレイヤーIDは既に使用されています。',
};

/** デフォルトのエラーメッセージ（未知のエラーコード用） */
const DEFAULT_ERROR_MESSAGE = 'エラーが発生しました。再度お試しください。';

/**
 * エラーコードから日本語メッセージを取得する
 * @param code バックエンド API のエラーコード
 * @returns 対応する日本語メッセージ（未知のコードはデフォルトメッセージ）
 */
export const getErrorMessage = (code: string): string =>
  errorMessages[code] ?? DEFAULT_ERROR_MESSAGE;
