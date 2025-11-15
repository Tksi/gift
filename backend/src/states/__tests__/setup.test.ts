import { describe, expect, it } from 'vitest';
import { createSetupSnapshot } from '../setup.js';

const samplePlayers = ['alice', 'bob', 'carl', 'dana'];

describe('createSetupSnapshot', () => {
  it('removes nine hidden cards from the deck range and keeps the rest as play deck', () => {
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

  it('uses deterministic ordering for deck and players when the same seed is supplied', () => {
    const seed = 'fixed-seed-for-testing';
    const first = createSetupSnapshot(samplePlayers, { seed });
    const second = createSetupSnapshot(samplePlayers, { seed });

    expect(first.rngSeed).toBe(seed);
    expect(second).toEqual(first);
  });

  it('shuffles player order independently while keeping every player exactly once', () => {
    const { playerOrder } = createSetupSnapshot(samplePlayers);
    const orderSet = new Set(playerOrder);

    expect(playerOrder.length).toBe(samplePlayers.length);

    for (const playerId of samplePlayers) {
      expect(orderSet.has(playerId)).toBe(true);
    }
  });

  it('creates different decks for different seeds', () => {
    const first = createSetupSnapshot(samplePlayers, { seed: 'seed-one' });
    const second = createSetupSnapshot(samplePlayers, { seed: 'seed-two' });

    expect(first.deck).not.toEqual(second.deck);
    expect(first.playerOrder).not.toEqual(second.playerOrder);
  });
});
