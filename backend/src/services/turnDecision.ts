/* eslint-disable no-param-reassign -- ターン処理ではクローンしたスナップショットを書き換える */

import {
  type ChipLedgerAction,
  collectCentralPotForPlayer,
  ensureChipActionAllowed as ensureChipLedgerActionAllowed,
  placeChipIntoCenter,
} from 'services/chipLedger.js';
import { createServiceError } from 'services/errors.js';
import { calculateScoreSummary } from 'services/scoreService.js';
import {
  type TimerSupervisor,
  calculateTurnDeadline,
} from 'services/timerSupervisor.js';
import type { EventLogService } from 'services/eventLogService.js';
import type {
  GameSnapshot,
  InMemoryGameStore,
} from 'states/inMemoryGameStore.js';

export type TurnDecisionAction = ChipLedgerAction;

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
  timerSupervisor: TimerSupervisor;
  turnTimeoutMs: number;
  eventLogs: EventLogService;
};

export type TurnDecisionResult = {
  snapshot: GameSnapshot;
  version: string;
};

export type TurnDecisionService = {
  applyCommand: (input: TurnCommandInput) => Promise<TurnDecisionResult>;
};

const createError = createServiceError;

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
  placeChipIntoCenter(snapshot, playerId);
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

  collectCentralPotForPlayer(snapshot, playerId);
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

const isGameCompleted = (snapshot: GameSnapshot): boolean =>
  snapshot.deck.length === 0 &&
  snapshot.turnState.cardInCenter === null &&
  snapshot.turnState.awaitingAction === false;

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

  ensureChipLedgerActionAllowed(snapshot, input.playerId, input.action);
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

const updateTurnDeadline = (
  snapshot: GameSnapshot,
  timestamp: string,
  timeoutMs: number,
) => {
  if (snapshot.turnState.awaitingAction) {
    snapshot.turnState.deadline = calculateTurnDeadline(timestamp, timeoutMs);

    return;
  }

  snapshot.turnState.deadline = null;
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

      const actingPlayerId =
        input.playerId === 'system'
          ? snapshot.turnState.currentPlayerId
          : input.playerId;
      const actionTurn = snapshot.turnState.turn;
      const cardBeforeAction = snapshot.turnState.cardInCenter;
      const centralPotBeforeAction = snapshot.centralPot;
      const chipsBeforeAction =
        snapshot.chips[actingPlayerId] ?? snapshot.chips[input.playerId] ?? 0;

      applyAction(snapshot, input);

      const chipsAfterAction =
        snapshot.chips[actingPlayerId] ?? snapshot.chips[input.playerId] ?? 0;
      const centralPotAfterAction = snapshot.centralPot;

      if (snapshot.phase === 'setup') {
        snapshot.phase = 'running';
      }

      const timestamp = dependencies.now();
      snapshot.updatedAt = timestamp;
      updateTurnDeadline(snapshot, timestamp, dependencies.turnTimeoutMs);

      if (input.action === 'placeChip' || input.action === 'takeCard') {
        dependencies.eventLogs.recordAction({
          sessionId: snapshot.sessionId,
          turn: actionTurn,
          actor: input.playerId,
          targetPlayer: actingPlayerId,
          action: input.action,
          card: cardBeforeAction,
          centralPotBefore: centralPotBeforeAction,
          centralPotAfter: centralPotAfterAction,
          chipsBefore: chipsBeforeAction,
          chipsAfter: chipsAfterAction,
          timestamp,
        });
      }

      let finalSummary: ReturnType<typeof calculateScoreSummary> | null = null;

      if (
        snapshot.finalResults === null &&
        snapshot.phase !== 'completed' &&
        isGameCompleted(snapshot)
      ) {
        snapshot.phase = 'completed';
        finalSummary = calculateScoreSummary(snapshot);
        snapshot.finalResults = finalSummary;
        snapshot.turnState.deadline = null;
      }

      const saved = dependencies.store.saveSnapshot(snapshot);
      dependencies.store.markCommandProcessed(input.sessionId, input.commandId);

      const next = saved.snapshot.turnState;
      const nextDeadline = next.deadline;

      if (
        next.awaitingAction &&
        nextDeadline !== null &&
        nextDeadline !== undefined
      ) {
        dependencies.timerSupervisor.register(
          saved.snapshot.sessionId,
          nextDeadline,
        );
      } else {
        dependencies.timerSupervisor.clear(saved.snapshot.sessionId);
      }

      if (finalSummary !== null) {
        dependencies.eventLogs.recordSystemEvent({
          sessionId: saved.snapshot.sessionId,
          turn: saved.snapshot.turnState.turn,
          actor: 'system',
          action: 'gameCompleted',
          timestamp,
          details: {
            finalResults: finalSummary,
          },
        });
      }

      return {
        snapshot: saved.snapshot,
        version: saved.version,
      };
    });
  };

  return { applyCommand };
};
