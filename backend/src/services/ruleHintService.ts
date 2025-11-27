import type { GameSnapshot } from 'states/inMemoryGameStore.js';

export type RuleHintEmphasis = 'info' | 'warning';

export type RuleHint = {
  text: string;
  emphasis: RuleHintEmphasis;
  turn: number;
  generatedAt: string;
};

export type StoredRuleHint = {
  sessionId: string;
  stateVersion: string;
  hint: RuleHint;
};

export type RuleHintService = {
  refreshHint: (snapshot: GameSnapshot, version: string) => StoredRuleHint;
  getLatestHint: (sessionId: string) => StoredRuleHint | null;
};

export type RuleHintServiceOptions = {
  now?: () => string;
};

const formatNoCardHint = (
  snapshot: GameSnapshot,
  timestamp: string,
): RuleHint => {
  const deckRemaining = snapshot.deck.length;

  return {
    text: `公開カードはありません。新しいターン待機中です。山札は残り ${deckRemaining} 枚です。`,
    emphasis: 'info',
    turn: snapshot.turnState.turn,
    generatedAt: timestamp,
  };
};

const formatForcedTakeHint = (
  snapshot: GameSnapshot,
  timestamp: string,
  card: number,
): RuleHint => ({
  text: `チップを使い切った ${snapshot.turnState.currentPlayerId} はカード ${card} を必ず取得します。中央ポット ${snapshot.centralPot} 枚も一緒に受け取ります。`,
  emphasis: 'warning',
  turn: snapshot.turnState.turn,
  generatedAt: timestamp,
});

const describeActionableHint = (
  snapshot: GameSnapshot,
  timestamp: string,
  card: number,
): RuleHint => {
  const centralPot = snapshot.centralPot;
  const effectiveValue = Math.max(card - centralPot, 0);
  const playerId = snapshot.turnState.currentPlayerId;
  const chips = snapshot.chips[playerId] ?? 0;
  const deckRemaining = snapshot.deck.length;
  const sentences: string[] = [
    `カード ${card} はポット ${centralPot} 枚で実質 ${effectiveValue} 点です。`,
  ];
  let emphasis: RuleHintEmphasis = 'info';

  if (chips <= 2) {
    sentences.push(
      `${playerId} の残りチップは ${chips} 枚です。支払うと選択肢が限られるため注意してください。`,
    );
    emphasis = 'warning';
  } else {
    sentences.push(
      `${playerId} はチップ ${chips} 枚を保有しており、支払いと取得のどちらも選べます。`,
    );
  }

  if (deckRemaining <= 5) {
    sentences.push(
      `山札は残り ${deckRemaining} 枚です。終盤の得点計画を意識しましょう。`,
    );
  }

  return {
    text: sentences.join(' '),
    emphasis,
    turn: snapshot.turnState.turn,
    generatedAt: timestamp,
  };
};

const createHintFromSnapshot = (
  snapshot: GameSnapshot,
  timestamp: string,
): RuleHint => {
  if (!snapshot.turnState.awaitingAction) {
    return formatNoCardHint(snapshot, timestamp);
  }

  const card = snapshot.turnState.cardInCenter;

  if (card === null) {
    return formatNoCardHint(snapshot, timestamp);
  }

  const currentPlayerId = snapshot.turnState.currentPlayerId;
  const chips = snapshot.chips[currentPlayerId] ?? 0;

  if (chips === 0) {
    return formatForcedTakeHint(snapshot, timestamp, card);
  }

  return describeActionableHint(snapshot, timestamp, card);
};

/**
 * ルールヘルプの生成とキャッシュ管理を担当するサービスを構築する。
 * @param options 生成時刻を差し替えるためのオプション。
 */
export const createRuleHintService = (
  options: RuleHintServiceOptions = {},
): RuleHintService => {
  const now = options.now ?? (() => new Date().toISOString());
  const cache = new Map<string, StoredRuleHint>();

  const refreshHint = (
    snapshot: GameSnapshot,
    version: string,
  ): StoredRuleHint => {
    const hint = createHintFromSnapshot(snapshot, now());
    const stored: StoredRuleHint = {
      sessionId: snapshot.sessionId,
      stateVersion: version,
      hint,
    };

    cache.set(snapshot.sessionId, stored);

    return stored;
  };

  const getLatestHint = (sessionId: string): StoredRuleHint | null =>
    cache.get(sessionId) ?? null;

  return {
    refreshHint,
    getLatestHint,
  };
};
