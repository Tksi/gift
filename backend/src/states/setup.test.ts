import { createSetupSnapshot } from 'states/setup.js';
import { describe, expect, it } from 'vitest';

const samplePlayers = ['alice', 'bob', 'carl', 'dana'];

describe('createSetupSnapshot の挙動', () => {
  it('33 枚のデッキから 9 枚を伏せ札にして残りを使用デッキとする', () => {
    const { deck, discardHidden } = createSetupSnapshot(samplePlayers);

    expect(deck.length).toBe(24);
    expect(discardHidden.length).toBe(9);

    const combined = [...deck, ...discardHidden].toSorted((a, b) => a - b);
    const expected = Array.from({ length: 33 }, (_, index) => index + 3);

    expect(combined).toEqual(expected);
    expect(new Set(deck).size).toBe(deck.length);

    for (const card of discardHidden) {
      expect(deck).not.toContain(card);
    }
  });

  it('同じシードを与えるとデッキとプレイヤー順が決定的になる', () => {
    const seed = 'fixed-seed-for-testing';
    const first = createSetupSnapshot(samplePlayers, { seed });
    const second = createSetupSnapshot(samplePlayers, { seed });

    expect(first.rngSeed).toBe(seed);
    expect(second).toEqual(first);
  });

  it('プレイヤー順は各プレイヤーを 1 度ずつ含んだランダム順になる', () => {
    const { playerOrder } = createSetupSnapshot(samplePlayers);
    const orderSet = new Set(playerOrder);

    expect(playerOrder.length).toBe(samplePlayers.length);

    for (const playerId of samplePlayers) {
      expect(orderSet.has(playerId)).toBe(true);
    }
  });

  it('異なるシードを与えると異なるデッキと順番が作られる', () => {
    const first = createSetupSnapshot(samplePlayers, { seed: 'seed-one' });
    const second = createSetupSnapshot(samplePlayers, { seed: 'seed-two' });

    expect(first.deck).not.toEqual(second.deck);
    expect(first.playerOrder).not.toEqual(second.playerOrder);
  });

  it('プレイヤー数が1名の場合はエラーを投げる', () => {
    expect(() => createSetupSnapshot(['solo'])).toThrowError(
      'Players must contain between 2 and 7 entries to satisfy setup rules.',
    );
  });

  it('プレイヤー数が8名以上の場合はエラーを投げる', () => {
    const eightPlayers = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

    expect(() => createSetupSnapshot(eightPlayers)).toThrowError(
      'Players must contain between 2 and 7 entries to satisfy setup rules.',
    );
  });

  it('プレイヤー数が2名のときはセットアップが成功する', () => {
    const twoPlayers = ['alice', 'bob'];
    const snapshot = createSetupSnapshot(twoPlayers);

    expect(snapshot.playerOrder).toHaveLength(2);
    expect(snapshot.deck).toHaveLength(24);
    expect(snapshot.discardHidden).toHaveLength(9);
  });

  it('プレイヤー数が7名のときはセットアップが成功する', () => {
    const sevenPlayers = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const snapshot = createSetupSnapshot(sevenPlayers);

    expect(snapshot.playerOrder).toHaveLength(7);
    expect(snapshot.deck).toHaveLength(24);
    expect(snapshot.discardHidden).toHaveLength(9);
  });
});
