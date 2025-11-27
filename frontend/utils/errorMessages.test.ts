import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './errorMessages';

describe('getErrorMessage', () => {
  describe('既知のエラーコードを正しい日本語メッセージに変換する', () => {
    it.each([
      ['SESSION_NOT_FOUND', 'セッションが見つかりません。'],
      ['PLAYER_COUNT_INVALID', 'プレイヤー数は2〜7人である必要があります。'],
      ['DUPLICATE_PLAYER_ID', 'プレイヤーIDが重複しています。'],
      ['STATE_VERSION_MISMATCH', '状態が更新されました。再度お試しください。'],
      ['RESULT_NOT_READY', 'ゲームがまだ終了していません。'],
      ['CHIP_INSUFFICIENT', 'チップが不足しています。'],
      ['TURN_NOT_AVAILABLE', 'あなたの手番ではありません。'],
      ['GAME_ALREADY_COMPLETED', 'このゲームは既に終了しています。'],
      ['PLAYER_NOT_FOUND', '指定されたプレイヤーが見つかりません。'],
      ['PLAYER_ORDER_INVALID', 'プレイヤー順序が不正です。'],
      ['NETWORK_ERROR', 'ネットワーク接続を確認してください。'],
    ])('コード "%s" を "%s" に変換する', (code, expectedMessage) => {
      expect(getErrorMessage(code)).toBe(expectedMessage);
    });
  });

  describe('未知のエラーコードに対するフォールバック', () => {
    it('未登録のエラーコードはデフォルトメッセージを返す', () => {
      const message = getErrorMessage('UNKNOWN_ERROR_CODE');

      expect(message).toBe('エラーが発生しました。再度お試しください。');
    });

    it('空文字のエラーコードはデフォルトメッセージを返す', () => {
      const message = getErrorMessage('');

      expect(message).toBe('エラーが発生しました。再度お試しください。');
    });
  });
});
