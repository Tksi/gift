import type { GameSnapshot } from 'states/inMemoryGameStore.js';

export type SseEventPayload = {
  id: string;
  event: string;
  data: string;
};

type SseConnection = {
  sessionId: string;
  send: (event: SseEventPayload) => void;
};

type ConnectOptions = {
  sessionId: string;
  lastEventId?: string;
  send: (event: SseEventPayload) => void;
};

export type SseBroadcastGateway = {
  connect: (options: ConnectOptions) => { disconnect: () => void };
  publishStateDelta: (
    sessionId: string,
    snapshot: GameSnapshot,
    version: string,
  ) => void;
  publishStateFinal: (
    sessionId: string,
    snapshot: GameSnapshot,
    version: string,
  ) => void;
  publishSystemError: (
    sessionId: string,
    payload: { code: string; message: string },
  ) => void;
};

const MAX_EVENT_HISTORY = 100;

const cloneValue = <T>(value: T): T => structuredClone(value);

const createStateDeltaEvent = (
  sessionId: string,
  snapshot: GameSnapshot,
  version: string,
): SseEventPayload => ({
  id: `state:${version}`,
  event: 'state.delta',
  data: JSON.stringify({
    session_id: sessionId,
    state_version: version,
    state: cloneValue(snapshot),
  }),
});

const createStateFinalEvent = (
  sessionId: string,
  snapshot: GameSnapshot,
  version: string,
): SseEventPayload | null => {
  if (snapshot.finalResults === null) {
    return null;
  }

  return {
    id: `state-final:${version}`,
    event: 'state.final',
    data: JSON.stringify({
      session_id: sessionId,
      state_version: version,
      final_results: cloneValue(snapshot.finalResults),
    }),
  };
};

const createSystemErrorEvent = (
  sessionId: string,
  payload: { code: string; message: string },
): SseEventPayload => ({
  id: `system-error:${Date.now().toString(16)}`,
  event: 'system.error',
  data: JSON.stringify({
    session_id: sessionId,
    error: payload,
  }),
});

/**
 * SSE 接続の登録とイベント履歴の管理を行うブロードキャストゲートウェイを構築する。
 */
export const createSseBroadcastGateway = (): SseBroadcastGateway => {
  const connections = new Map<string, Set<SseConnection>>();
  const history = new Map<string, SseEventPayload[]>();

  const appendHistory = (sessionId: string, event: SseEventPayload) => {
    const events = history.get(sessionId) ?? [];
    events.push(event);

    if (events.length > MAX_EVENT_HISTORY) {
      events.splice(0, events.length - MAX_EVENT_HISTORY);
    }

    history.set(sessionId, events);
  };

  const broadcast = (sessionId: string, event: SseEventPayload) => {
    appendHistory(sessionId, event);
    const listeners = connections.get(sessionId);

    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener.send(event);
    }
  };

  const replayHistory = (
    sessionId: string,
    send: (event: SseEventPayload) => void,
    lastEventId?: string,
  ) => {
    const events = history.get(sessionId);

    if (!events || events.length === 0) {
      return;
    }

    if (lastEventId === undefined) {
      for (const event of events) {
        send(event);
      }

      return;
    }

    const index = events.findIndex((event) => event.id === lastEventId);

    if (index === -1) {
      for (const event of events) {
        send(event);
      }

      return;
    }

    for (let offset = index + 1; offset < events.length; offset += 1) {
      const event = events[offset];

      if (!event) {
        continue;
      }

      send(event);
    }
  };

  const connect = (options: ConnectOptions) => {
    const listeners =
      connections.get(options.sessionId) ?? new Set<SseConnection>();
    const connection: SseConnection = {
      sessionId: options.sessionId,
      send: options.send,
    };

    listeners.add(connection);
    connections.set(options.sessionId, listeners);
    replayHistory(options.sessionId, options.send, options.lastEventId);

    const disconnect = () => {
      const current = connections.get(options.sessionId);

      if (!current) {
        return;
      }

      current.delete(connection);

      if (current.size === 0) {
        connections.delete(options.sessionId);
      }
    };

    return { disconnect };
  };

  const publishStateDelta = (
    sessionId: string,
    snapshot: GameSnapshot,
    version: string,
  ) => {
    broadcast(sessionId, createStateDeltaEvent(sessionId, snapshot, version));
  };

  const publishStateFinal = (
    sessionId: string,
    snapshot: GameSnapshot,
    version: string,
  ) => {
    const event = createStateFinalEvent(sessionId, snapshot, version);

    if (!event) {
      return;
    }

    broadcast(sessionId, event);
  };

  const publishSystemError = (
    sessionId: string,
    payload: { code: string; message: string },
  ) => {
    broadcast(sessionId, createSystemErrorEvent(sessionId, payload));
  };

  return {
    connect,
    publishStateDelta,
    publishStateFinal,
    publishSystemError,
  };
};
