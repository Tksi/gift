import type { MonitoringService } from 'services/monitoringService.js';
import type { InMemoryGameStore } from 'states/inMemoryGameStore.js';

type TimerHandle = ReturnType<typeof setTimeout>;

export type TimerSupervisorDependencies = {
  store: InMemoryGameStore;
  now: () => number;
  schedule: (handler: () => void, delayMs: number) => TimerHandle;
  cancel: (handle: TimerHandle) => void;
  onTimeout?: (sessionId: string) => Promise<void> | void;
  monitoring?: MonitoringService;
};

export type TimerSupervisor = {
  register: (sessionId: string, deadlineIso: string | null | undefined) => void;
  clear: (sessionId: string) => void;
  restore: () => void;
};

const parseDeadline = (iso: string): number | undefined => {
  const timestamp = Date.parse(iso);

  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return timestamp;
};

const nowFromIso = (iso: string): number => {
  const parsed = parseDeadline(iso);

  if (parsed === undefined) {
    return Date.now();
  }

  return parsed;
};

/**
 * 基準時刻と制限時間から締切 ISO 文字列を算出する。
 * @param baseIso ターン開始時刻。
 * @param durationMs 締切までのミリ秒。
 */
export const calculateTurnDeadline = (
  baseIso: string,
  durationMs: number,
): string => new Date(nowFromIso(baseIso) + durationMs).toISOString();

/**
 * ターン締切のセット/解除/復元を担うタイマー管理を構築する。
 * @param dependencies ストアや setTimeout ラッパー。
 */
export const createTimerSupervisor = (
  dependencies: TimerSupervisorDependencies,
): TimerSupervisor => {
  const clear = (sessionId: string): void => {
    const envelope = dependencies.store.getEnvelope(sessionId);

    if (envelope?.deadlineHandle === undefined) {
      return;
    }

    const turn = envelope.snapshot.turnState.turn;
    dependencies.cancel(envelope.deadlineHandle);
    delete envelope.deadlineHandle;
    delete envelope.deadlineAt;

    dependencies.monitoring?.logTimerEvent({
      sessionId,
      action: 'clear',
      turn,
    });
  };

  const register = (
    sessionId: string,
    deadlineIso: string | null | undefined,
  ): void => {
    const envelope = dependencies.store.getEnvelope(sessionId);

    if (envelope === undefined) {
      return;
    }

    const existingHandle = envelope.deadlineHandle;

    if (existingHandle !== undefined) {
      dependencies.cancel(existingHandle);
      delete envelope.deadlineHandle;
      delete envelope.deadlineAt;
    }

    if (deadlineIso === undefined || deadlineIso === null) {
      return;
    }

    const dueTime = parseDeadline(deadlineIso);

    if (dueTime === undefined) {
      return;
    }

    const turn = envelope.snapshot.turnState.turn;
    const delay = Math.max(0, dueTime - dependencies.now());
    const handle = dependencies.schedule(() => {
      delete envelope.deadlineHandle;
      delete envelope.deadlineAt;
      void dependencies.onTimeout?.(sessionId);
    }, delay);

    envelope.deadlineHandle = handle;
    envelope.deadlineAt = dueTime;

    dependencies.monitoring?.logTimerEvent({
      sessionId,
      action: 'register',
      deadline: deadlineIso,
      turn,
    });
  };

  const restore = (): void => {
    for (const summary of dependencies.store.listSessions()) {
      const envelope = dependencies.store.getEnvelope(summary.sessionId);

      if (envelope === undefined) {
        continue;
      }

      const deadline = envelope.snapshot.turnState.deadline;

      if (
        deadline === undefined ||
        deadline === null ||
        envelope.snapshot.turnState.awaitingAction === false
      ) {
        clear(summary.sessionId);

        continue;
      }

      register(summary.sessionId, deadline);
    }
  };

  return { register, clear, restore };
};
