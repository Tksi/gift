import { createHash, randomBytes } from 'node:crypto';

const CARD_MIN = 3;
const CARD_MAX = 35;
const HIDDEN_CARD_COUNT = 9;

export type SetupOptions = {
  seed?: string;
};

export type SetupSnapshot = {
  deck: number[];
  discardHidden: number[];
  playerOrder: string[];
  rngSeed: string;
};

const createCardRange = (): number[] =>
  Array.from(
    { length: CARD_MAX - CARD_MIN + 1 },
    (_, index) => CARD_MIN + index,
  );

const createSeed = (): string => randomBytes(16).toString('hex');

const createSeededRandom = (seed: string): (() => number) => {
  let counter = 0;

  return () => {
    const hash = createHash('sha256');
    hash.update(seed);
    hash.update(counter.toString(16));
    counter += 1;
    const digest = hash.digest();
    const value = digest.readUInt32BE(0);

    return value / 0xff_ff_ff_ff;
  };
};

const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const items = [...values];

  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = items[index];
    const candidate = items[swapIndex];

    if (current === undefined || candidate === undefined) {
      continue;
    }

    items[index] = candidate;
    items[swapIndex] = current;
  }

  return items;
};

const assertPlayerCount = (playerIds: readonly string[]): void => {
  if (playerIds.length < 2 || playerIds.length > 7) {
    throw new Error(
      'Players must contain between 2 and 7 entries to satisfy setup rules.',
    );
  }
};

/**
 * Generates the initial deck order, hidden cards, and randomized player order.
 * @param playerIds プレイヤー ID の配列（2〜7名）。
 * @param options シードなどのオプション。
 */
export const createSetupSnapshot = (
  playerIds: readonly string[],
  options: SetupOptions = {},
): SetupSnapshot => {
  assertPlayerCount(playerIds);

  const rngSeed = options.seed ?? createSeed();
  const random = createSeededRandom(rngSeed);
  const shuffledDeck = shuffle(createCardRange(), random);

  const discardHidden = shuffledDeck.slice(0, HIDDEN_CARD_COUNT);
  const deck = shuffledDeck.slice(HIDDEN_CARD_COUNT);
  const playerOrder = shuffle(playerIds, random);

  return {
    deck,
    discardHidden,
    playerOrder,
    rngSeed,
  };
};
