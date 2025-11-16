import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type {
  EventLogEntry,
  InMemoryGameStore,
} from 'states/inMemoryGameStore.js';

export type RecordActionInput = {
  sessionId: string;
  turn: number;
  actor: string;
  targetPlayer?: string;
  action: string;
  card: number | null;
  centralPotBefore: number;
  centralPotAfter: number;
  chipsBefore: number;
  chipsAfter: number;
  timestamp: string;
};

export type RecordSystemEventInput = {
  sessionId: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
  chipsDelta?: number;
};

export type ReplayEntriesInput = {
  sessionId: string;
  lastEventId?: string;
  send: (entry: EventLogEntry) => Promise<void> | void;
};

export type EventLogService = {
  recordAction: (input: RecordActionInput) => EventLogEntry;
  recordSystemEvent: (input: RecordSystemEventInput) => EventLogEntry;
  replayEntries: (input: ReplayEntriesInput) => Promise<void>;
  isEventLogId: (value: string | null) => boolean;
};

export type EventLogServiceDependencies = {
  store: InMemoryGameStore;
  sseGateway: SseBroadcastGateway;
};

const isEventLogIdentifier = (value: string | null): boolean =>
  typeof value === 'string' && value.startsWith('turn-');

const createEntryId = (
  store: InMemoryGameStore,
  sessionId: string,
  turn: number,
): string => {
  const existing = store.listEventLogAfter(sessionId);
  const count = existing.filter((entry) => entry.turn === turn).length;

  return `turn-${turn}-log-${count + 1}`;
};

const appendEntries = (
  store: InMemoryGameStore,
  gateway: SseBroadcastGateway,
  sessionId: string,
  entries: readonly EventLogEntry[],
) => {
  const saved = store.appendEventLog(sessionId, entries);

  for (const entry of saved) {
    gateway.publishEventLog(sessionId, entry);
  }

  return saved;
};

/**
 * イベントログの永続化と SSE 配信を司るサービスを構築する。
 * @param dependencies ストアと SSE ゲートウェイ。
 */
export const createEventLogService = (
  dependencies: EventLogServiceDependencies,
): EventLogService => {
  const recordAction = (input: RecordActionInput): EventLogEntry => {
    const id = createEntryId(dependencies.store, input.sessionId, input.turn);
    const chipsDelta = input.chipsAfter - input.chipsBefore;

    const entry: EventLogEntry = {
      id,
      turn: input.turn,
      actor: input.actor,
      action: input.action,
      timestamp: input.timestamp,
      chipsDelta,
      details: {
        card: input.card,
        centralPotBefore: input.centralPotBefore,
        centralPotAfter: input.centralPotAfter,
        targetPlayer: input.targetPlayer ?? input.actor,
      },
    };

    appendEntries(
      dependencies.store,
      dependencies.sseGateway,
      input.sessionId,
      [entry],
    );

    return entry;
  };

  const recordSystemEvent = (input: RecordSystemEventInput): EventLogEntry => {
    const id = createEntryId(dependencies.store, input.sessionId, input.turn);

    const entry: EventLogEntry = {
      id,
      turn: input.turn,
      actor: input.actor,
      action: input.action,
      timestamp: input.timestamp,
      ...(input.details !== undefined && { details: input.details }),
      ...(input.chipsDelta !== undefined && {
        chipsDelta: input.chipsDelta,
      }),
    };

    appendEntries(
      dependencies.store,
      dependencies.sseGateway,
      input.sessionId,
      [entry],
    );

    return entry;
  };

  const replayEntries = async ({
    sessionId,
    lastEventId,
    send,
  }: ReplayEntriesInput): Promise<void> => {
    const entries = dependencies.store.listEventLogAfter(
      sessionId,
      lastEventId,
    );

    for (const entry of entries) {
      await send(entry);
    }
  };

  return {
    recordAction,
    recordSystemEvent,
    replayEntries,
    isEventLogId: isEventLogIdentifier,
  };
};
