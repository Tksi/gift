/* eslint-disable no-param-reassign -- チップ残量管理ではスナップショットを直接更新する */

import { createServiceError } from 'services/errors.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

export type ChipLedgerAction = 'placeChip' | 'takeCard';

export type ChipLedgerNotification = {
  type: 'chip.collect' | 'chip.place';
  playerId: string;
  chipsDelta: number;
  resultingChips: number;
  centralPot: number;
};

const ensurePlayerRegistered = (
  snapshot: GameSnapshot,
  playerId: string,
): number => {
  const chips = snapshot.chips[playerId];

  if (typeof chips !== 'number') {
    throw createServiceError(
      'PLAYER_NOT_FOUND',
      404,
      `Player ${playerId} is not registered.`,
    );
  }

  return chips;
};

/**
 * プレイヤーの所持チップに基づきアクション実行可否を検証する。
 * @param snapshot チップ状況を保持しているゲームスナップショット
 * @param playerId 判定対象のプレイヤーID
 * @param action 検証するアクション種別
 */
export const ensureChipActionAllowed = (
  snapshot: GameSnapshot,
  playerId: string,
  action: ChipLedgerAction,
): void => {
  const chips = ensurePlayerRegistered(snapshot, playerId);

  if (chips > 0) {
    return;
  }

  if (action === 'takeCard') {
    return;
  }

  throw createServiceError(
    'CHIP_INSUFFICIENT',
    422,
    'Player does not have enough chips.',
  );
};

/**
 * 現在のプレイヤーから 1 枚チップを徴収し中央ポットへ移す。
 * @param snapshot チップ状況を保持しているゲームスナップショット
 * @param playerId チップを支払うプレイヤーID
 */
export const placeChipIntoCenter = (
  snapshot: GameSnapshot,
  playerId: string,
): ChipLedgerNotification => {
  const chips = ensurePlayerRegistered(snapshot, playerId);

  if (chips <= 0) {
    throw createServiceError(
      'CHIP_INSUFFICIENT',
      422,
      'Player does not have enough chips.',
    );
  }

  const updated = chips - 1;

  snapshot.chips[playerId] = updated;
  snapshot.centralPot += 1;

  return {
    type: 'chip.place',
    playerId,
    chipsDelta: -1,
    resultingChips: updated,
    centralPot: snapshot.centralPot,
  };
};

/**
 * 中央ポットにあるチップ全量をプレイヤーへ払い戻す。
 * @param snapshot チップ状況を保持しているゲームスナップショット
 * @param playerId 受け取るプレイヤーID
 */
export const collectCentralPotForPlayer = (
  snapshot: GameSnapshot,
  playerId: string,
): ChipLedgerNotification | null => {
  const chips = ensurePlayerRegistered(snapshot, playerId);
  const pot = snapshot.centralPot;

  if (pot <= 0) {
    return null;
  }

  const updated = chips + pot;
  snapshot.chips[playerId] = updated;
  snapshot.centralPot = 0;

  return {
    type: 'chip.collect',
    playerId,
    chipsDelta: pot,
    resultingChips: updated,
    centralPot: snapshot.centralPot,
  };
};
