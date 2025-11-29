import type { z } from '@hono/zod-openapi';
import type {
  scorePlacementSchema,
  scoreSummarySchema,
  scoreTieBreakSchema,
} from 'schema/game.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

export type ScorePlacement = z.infer<typeof scorePlacementSchema>;

export type ScoreTieBreak = z.infer<typeof scoreTieBreakSchema>;

export type ScoreSummary = z.infer<typeof scoreSummarySchema>;

const createCardSets = (cards: readonly number[]): number[][] => {
  const sorted = [...cards].toSorted((a, b) => a - b);
  const sets: number[][] = [];

  for (const card of sorted) {
    const current = sets.at(-1);
    const lastValue = current?.at(-1);

    if (current && lastValue !== undefined && card === lastValue + 1) {
      current.push(card);
    } else {
      sets.push([card]);
    }
  }

  if (sorted.length === 0) {
    return [];
  }

  return sets;
};

const createPlacement = (
  playerId: string,
  cards: readonly number[],
  chips: number,
): Omit<ScorePlacement, 'rank'> => {
  const sets = createCardSets(cards);
  const totalCards = cards.reduce((sum, card) => sum + card, 0);
  const score = chips - totalCards;

  return {
    playerId,
    score,
    chipsRemaining: chips,
    cards: [...cards].toSorted((a, b) => a - b),
    cardSets: sets,
  };
};

const sortPlacements = (
  placements: Omit<ScorePlacement, 'rank'>[],
): ScorePlacement[] => {
  const sorted = placements
    .map((placement) => ({ ...placement, rank: 0 }))
    .toSorted((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      if (a.chipsRemaining !== b.chipsRemaining) {
        return b.chipsRemaining - a.chipsRemaining;
      }

      return a.playerId.localeCompare(b.playerId);
    });

  let currentRank = 0;
  let lastScore: number | undefined;
  let lastChips: number | undefined;

  for (const placement of sorted) {
    if (
      lastScore === undefined ||
      lastChips === undefined ||
      placement.score !== lastScore ||
      placement.chipsRemaining !== lastChips
    ) {
      currentRank += 1;
      lastScore = placement.score;
      lastChips = placement.chipsRemaining;
    }

    placement.rank = currentRank;
  }

  return sorted;
};

const detectTieBreak = (placements: ScorePlacement[]): ScoreTieBreak | null => {
  let tieGroup:
    | {
        score: number;
        contenders: ScorePlacement[];
      }
    | undefined;

  for (const placement of placements) {
    const existingGroup =
      tieGroup && tieGroup.score === placement.score ? tieGroup : undefined;

    if (existingGroup) {
      existingGroup.contenders.push(placement);
    } else {
      const sameScore = placements.filter(
        (candidate) => candidate.score === placement.score,
      );

      if (sameScore.length > 1) {
        tieGroup = { score: placement.score, contenders: sameScore };

        break;
      }
    }
  }

  if (!tieGroup) {
    return null;
  }

  const maxChips = Math.max(
    ...tieGroup.contenders.map((item) => item.chipsRemaining),
  );
  const winners = tieGroup.contenders
    .filter((item) => item.chipsRemaining === maxChips)
    .map((item) => item.playerId)
    .toSorted((a, b) => a.localeCompare(b));

  return {
    reason: 'chipCount',
    tiedScore: tieGroup.score,
    contenders: tieGroup.contenders
      .map((item) => item.playerId)
      .toSorted((a, b) => a.localeCompare(b)),
    winner: winners.length === 1 ? (winners[0] ?? null) : null,
  };
};

/**
 * ゲームスナップショットから最終スコアサマリーを算出する。
 * @param snapshot 対象のゲームスナップショット。
 */
export const calculateScoreSummary = (snapshot: GameSnapshot): ScoreSummary => {
  const placements = snapshot.players.map((player) =>
    createPlacement(
      player.id,
      snapshot.hands[player.id] ?? [],
      snapshot.chips[player.id] ?? 0,
    ),
  );
  const sorted = sortPlacements(placements);

  return {
    placements: sorted,
    tieBreak: detectTieBreak(sorted),
  };
};
