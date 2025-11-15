/* eslint-disable no-param-reassign -- ターン処理ではクローンしたスナップショットを書き換える */

import type {
  GameSnapshot,
  InMemoryGameStore,
} from 'states/inMemoryGameStore.js';

export type TurnDecisionAction = 'placeChip' | 'takeCard';

export type TurnCommandInput = {
  sessionId: string;
  commandId: string;
  expectedVersion: string;
  playerId: string;
  action: TurnDecisionAction;
};

export type TurnDecisionDependencies = {
  store: InMemoryGameStore;
  now: () => string;
};

export type TurnDecisionResult = {
  snapshot: GameSnapshot;
  version: string;
};

export type TurnDecisionService = {
  applyCommand: (input: TurnCommandInput) => Promise<TurnDecisionResult>;
};

type TurnDecisionError = Error & {
  code: string;
  status: number;
};

const createError = (code: string, status: number, message: string) =>
  Object.assign(new Error(message), { code, status }) as TurnDecisionError;

const cloneSnapshot = (snapshot: GameSnapshot): GameSnapshot =>
  structuredClone(snapshot);

const ensureSessionEnvelope = (store: InMemoryGameStore, sessionId: string) => {
  const envelope = store.getEnvelope(sessionId);

  if (!envelope) {
    throw createError('SESSION_NOT_FOUND', 404, 'Session does not exist.');
  }

  return envelope;
};

const nextPlayerIndex = (totalPlayers: number, currentIndex: number): number =>
  totalPlayers === 0 ? 0 : (currentIndex + 1) % totalPlayers;

const rotateToNextPlayer = (snapshot: GameSnapshot): void => {
  const total = snapshot.playerOrder.length;

  if (total === 0) {
    throw createError(
      'PLAYER_ORDER_INVALID',
      422,
      'Player order is not initialized.',
    );
  }

  const nextIndex = nextPlayerIndex(
    total,
    snapshot.turnState.currentPlayerIndex,
  );
  const nextPlayerId = snapshot.playerOrder[nextIndex];

  if (nextPlayerId === undefined) {
    throw createError(
      'PLAYER_ORDER_INVALID',
      422,
      'Player order is not initialized.',
    );
  }

  snapshot.turnState.currentPlayerIndex = nextIndex;
  snapshot.turnState.currentPlayerId = nextPlayerId;
};

const findPlayerIndex = (snapshot: GameSnapshot, playerId: string): number => {
  const index = snapshot.playerOrder.indexOf(playerId);

  if (index === -1) {
    return 0;
  }

  return index;
};

const sortHand = (cards: number[]): number[] => cards.toSorted((a, b) => a - b);

const drawNextCard = (snapshot: GameSnapshot): number | undefined => {
  if (snapshot.deck.length === 0) {
    return undefined;
  }

  const [nextCard, ...rest] = snapshot.deck;
  snapshot.deck = rest;

  return nextCard;
};

const applyPlaceChip = (snapshot: GameSnapshot): void => {
  const playerId = snapshot.turnState.currentPlayerId;
  const chipCount = snapshot.chips[playerId];

  if (chipCount === undefined) {
    throw createError(
      'PLAYER_NOT_FOUND',
      404,
      `Player ${playerId} is not registered.`,
    );
  }

  if (chipCount <= 0) {
    throw createError(
      'CHIP_INSUFFICIENT',
      422,
      'Player does not have enough chips.',
    );
  }

  snapshot.chips[playerId] = chipCount - 1;
  snapshot.centralPot += 1;
  rotateToNextPlayer(snapshot);
};

const applyTakeCard = (snapshot: GameSnapshot): void => {
  const card = snapshot.turnState.cardInCenter;
  const playerId = snapshot.turnState.currentPlayerId;

  if (card === null) {
    throw createError(
      'TURN_NOT_AVAILABLE',
      422,
      'No active card is available.',
    );
  }

  const hand = snapshot.hands[playerId] ?? [];
  snapshot.hands[playerId] = sortHand([...hand, card]);

  if (snapshot.centralPot > 0) {
    const chips = snapshot.chips[playerId] ?? 0;
    snapshot.chips[playerId] = chips + snapshot.centralPot;
  }

  snapshot.centralPot = 0;
  snapshot.turnState.cardInCenter = null;
  snapshot.turnState.awaitingAction = false;

  const nextCard = drawNextCard(snapshot);

  if (nextCard !== undefined) {
    snapshot.turnState.cardInCenter = nextCard;
    snapshot.turnState.turn += 1;
    snapshot.turnState.awaitingAction = true;
  }

  snapshot.turnState.currentPlayerId = playerId;
  snapshot.turnState.currentPlayerIndex = findPlayerIndex(snapshot, playerId);
};

const ensureActionAllowed = (
  snapshot: GameSnapshot,
  input: TurnCommandInput,
) => {
  if (snapshot.phase === 'completed') {
    throw createError(
      'GAME_ALREADY_COMPLETED',
      409,
      'Game session already completed.',
    );
  }

  if (!snapshot.turnState.awaitingAction) {
    throw createError(
      'TURN_NOT_AVAILABLE',
      422,
      'There is no active card waiting for an action.',
    );
  }

  const currentPlayerId = snapshot.turnState.currentPlayerId;

  if (input.playerId === 'system') {
    return;
  }

  if (currentPlayerId !== input.playerId) {
    throw createError(
      'TURN_NOT_AVAILABLE',
      422,
      'Action is only allowed for the current player.',
    );
  }
};

const applyAction = (snapshot: GameSnapshot, input: TurnCommandInput) => {
  switch (input.action) {
    case 'placeChip': {
      applyPlaceChip(snapshot);

      return;
    }
    case 'takeCard': {
      applyTakeCard(snapshot);

      return;
    }
    default: {
      const unsupportedAction = input.action as string;

      throw createError(
        'ACTION_NOT_SUPPORTED',
        422,
        `Action ${unsupportedAction} is not supported.`,
      );
    }
  }
};

/**
 * ターン進行コマンドを処理するサービスを構築する。
 * @param dependencies ストアやクロックなどの依存性。
 */
export const createTurnDecisionService = (
  dependencies: TurnDecisionDependencies,
): TurnDecisionService => {
  const applyCommand = async (
    input: TurnCommandInput,
  ): Promise<TurnDecisionResult> => {
    const envelope = ensureSessionEnvelope(dependencies.store, input.sessionId);

    return envelope.mutex.runExclusive(() => {
      const current = ensureSessionEnvelope(
        dependencies.store,
        input.sessionId,
      );

      if (
        dependencies.store.hasProcessedCommand(input.sessionId, input.commandId)
      ) {
        return {
          snapshot: current.snapshot,
          version: current.version,
        };
      }

      if (input.expectedVersion !== current.version) {
        throw createError(
          'STATE_VERSION_MISMATCH',
          409,
          'State version does not match the latest snapshot.',
        );
      }

      const snapshot = cloneSnapshot(current.snapshot);
      ensureActionAllowed(snapshot, input);
      applyAction(snapshot, input);

      if (snapshot.phase === 'setup') {
        snapshot.phase = 'running';
      }

      snapshot.updatedAt = dependencies.now();

      const saved = dependencies.store.saveSnapshot(snapshot);
      dependencies.store.markCommandProcessed(input.sessionId, input.commandId);

      return {
        snapshot: saved.snapshot,
        version: saved.version,
      };
    });
  };

  return { applyCommand };
};
