import { createRuleHintService } from 'services/ruleHintService.js';
import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

const createSnapshot = (override: Partial<GameSnapshot> = {}): GameSnapshot => {
  const base: GameSnapshot = {
    sessionId: 'session-hint',
    phase: 'running',
    deck: [25, 26, 27],
    discardHidden: [],
    playerOrder: ['alice', 'bob'],
    rngSeed: 'seed',
    players: [
      { id: 'alice', displayName: 'Alice' },
      { id: 'bob', displayName: 'Bob' },
    ],
    chips: { alice: 5, bob: 7 },
    hands: { alice: [], bob: [] },
    centralPot: 3,
    turnState: {
      turn: 2,
      currentPlayerId: 'alice',
      currentPlayerIndex: 0,
      cardInCenter: 15,
      awaitingAction: true,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    finalResults: null,
  };

  return {
    ...base,
    ...override,
    deck: override.deck ?? base.deck,
    discardHidden: override.discardHidden ?? base.discardHidden,
    playerOrder: override.playerOrder ?? base.playerOrder,
    players: override.players ?? base.players,
    chips: override.chips ?? base.chips,
    hands: override.hands ?? base.hands,
    turnState: override.turnState ?? base.turnState,
  };
};

describe('createRuleHintService', () => {
  it('中央ポットとカードに基づく info ヒントを生成する', () => {
    const service = createRuleHintService({
      now: () => '2025-01-01T00:00:05.000Z',
    });
    const snapshot = createSnapshot();
    const stored = service.refreshHint(snapshot, 'version-1');

    expect(stored.hint.text).toContain('カード 15');
    expect(stored.hint.text).toContain('ポット 3 枚');
    expect(stored.hint.emphasis).toBe('info');
    expect(stored.hint.generatedAt).toBe('2025-01-01T00:00:05.000Z');
    expect(stored.stateVersion).toBe('version-1');
  });

  it('チップが 0 の場合は warning ヒントを返す', () => {
    const service = createRuleHintService({
      now: () => '2025-01-01T00:00:10.000Z',
    });
    const snapshot = createSnapshot({
      chips: { alice: 0, bob: 7 },
    });

    const stored = service.refreshHint(snapshot, 'version-2');
    expect(stored.hint.emphasis).toBe('warning');
    expect(stored.hint.text).toContain('必ず取得');
  });

  it('最新ヒントをキャッシュから取得できる', () => {
    const service = createRuleHintService({
      now: () => '2025-01-01T00:00:15.000Z',
    });
    const snapshot = createSnapshot();

    expect(service.getLatestHint(snapshot.sessionId)).toBeNull();

    service.refreshHint(snapshot, 'version-3');
    const latest = service.getLatestHint(snapshot.sessionId);

    expect(latest?.hint.text).toContain('カード 15');
    expect(latest?.stateVersion).toBe('version-3');
  });
});
