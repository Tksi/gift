import { createHash } from 'node:crypto';

export type GamePhase = 'completed' | 'running' | 'setup';

export type PlayerSummary = {
  id: string;
  displayName: string;
};

export type GameSnapshot = {
  sessionId: string;
  phase: GamePhase;
  deck: number[];
  discardHidden: number[];
  playerOrder: string[];
  rngSeed: string;
  players: PlayerSummary[];
  chips: Record<string, number>;
  hands: Record<string, number[]>;
  centralPot: number;
  createdAt: string;
  updatedAt: string;
};

export type EventLogEntry = {
  id: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  chipsDelta?: number;
  details?: Record<string, unknown>;
};

export type Mutex = {
  runExclusive: <T>(task: () => Promise<T> | T) => Promise<T>;
};

export type SessionEnvelope = {
  version: string;
  snapshot: GameSnapshot;
  eventLog: EventLogEntry[];
  processedCommands: Set<string>;
  mutex: Mutex;
};

export type SessionSummary = {
  sessionId: string;
  phase: GamePhase;
  version: string;
  updatedAt: string;
};

export type InMemoryGameStore = {
  saveSnapshot: (snapshot: GameSnapshot) => SessionEnvelope;
  getSnapshot: (sessionId: string) => GameSnapshot | undefined;
  getEnvelope: (sessionId: string) => SessionEnvelope | undefined;
  appendEventLog: (
    sessionId: string,
    entries: readonly EventLogEntry[],
  ) => EventLogEntry[];
  listEventLogAfter: (sessionId: string, afterId?: string) => EventLogEntry[];
  hasProcessedCommand: (sessionId: string, commandId: string) => boolean;
  markCommandProcessed: (sessionId: string, commandId: string) => void;
  listSessions: () => SessionSummary[];
};

const cloneValue = <T>(value: T): T => structuredClone(value);

const createSnapshotVersion = (snapshot: GameSnapshot): string =>
  createHash('sha1').update(JSON.stringify(snapshot)).digest('hex');

const createMutex = (): Mutex => {
  let tail: Promise<unknown> = Promise.resolve();

  const runExclusive = async <T>(task: () => Promise<T> | T): Promise<T> => {
    const run = tail.then(
      () => task(),
      () => task(),
    );

    const release = (): void => {
      tail = Promise.resolve();
    };

    tail = run.then(release, release);

    return run;
  };

  return { runExclusive };
};

const ensureEnvelope = (
  sessions: Map<string, SessionEnvelope>,
  sessionId: string,
): SessionEnvelope => {
  const envelope = sessions.get(sessionId);

  if (!envelope) {
    throw new Error(`Session ${sessionId} is not initialized`);
  }

  return envelope;
};

/**
 * Maintains Geschenkt session envelopes fully in memory for the current process.
 */
export const createInMemoryGameStore = (): InMemoryGameStore => {
  const sessions = new Map<string, SessionEnvelope>();

  const saveSnapshot = (snapshot: GameSnapshot): SessionEnvelope => {
    const normalizedSnapshot = cloneValue(snapshot);
    const version = createSnapshotVersion(normalizedSnapshot);
    const existing = sessions.get(snapshot.sessionId);

    if (existing) {
      existing.snapshot = normalizedSnapshot;
      existing.version = version;

      return existing;
    }

    const created: SessionEnvelope = {
      snapshot: normalizedSnapshot,
      version,
      eventLog: [],
      processedCommands: new Set<string>(),
      mutex: createMutex(),
    };

    sessions.set(snapshot.sessionId, created);

    return created;
  };

  const getSnapshot = (sessionId: string): GameSnapshot | undefined => {
    const envelope = sessions.get(sessionId);

    if (!envelope) {
      return undefined;
    }

    return cloneValue(envelope.snapshot);
  };

  const getEnvelope = (sessionId: string): SessionEnvelope | undefined =>
    sessions.get(sessionId);

  const appendEventLog = (
    sessionId: string,
    entries: readonly EventLogEntry[],
  ): EventLogEntry[] => {
    const envelope = ensureEnvelope(sessions, sessionId);
    const normalized = entries.map((entry) => cloneValue(entry));

    for (const entry of normalized) {
      envelope.eventLog.push(entry);
    }

    return normalized;
  };

  const listEventLogAfter = (
    sessionId: string,
    afterId?: string,
  ): EventLogEntry[] => {
    const envelope = ensureEnvelope(sessions, sessionId);

    if (afterId === undefined) {
      return envelope.eventLog.map((entry) => cloneValue(entry));
    }

    const index = envelope.eventLog.findIndex((entry) => entry.id === afterId);

    if (index === -1) {
      return envelope.eventLog.map((entry) => cloneValue(entry));
    }

    return envelope.eventLog.slice(index + 1).map((entry) => cloneValue(entry));
  };

  const hasProcessedCommand = (
    sessionId: string,
    commandId: string,
  ): boolean => {
    const envelope = ensureEnvelope(sessions, sessionId);

    return envelope.processedCommands.has(commandId);
  };

  const markCommandProcessed = (sessionId: string, commandId: string): void => {
    const envelope = ensureEnvelope(sessions, sessionId);
    envelope.processedCommands.add(commandId);
  };

  const listSessions = (): SessionSummary[] =>
    [...sessions.entries()].map(([sessionId, envelope]) => ({
      sessionId,
      version: envelope.version,
      phase: envelope.snapshot.phase,
      updatedAt: envelope.snapshot.updatedAt,
    }));

  return {
    saveSnapshot,
    getSnapshot,
    getEnvelope,
    appendEventLog,
    listEventLogAfter,
    hasProcessedCommand,
    markCommandProcessed,
    listSessions,
  };
};
