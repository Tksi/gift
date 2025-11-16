import type { EventLogService } from 'services/eventLogService.js';
import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type { TimerSupervisor } from 'services/timerSupervisor.js';
import type { TurnDecisionService } from 'services/turnDecision.js';
import type { InMemoryGameStore } from 'states/inMemoryGameStore.js';

export type SessionRouteDependencies = {
  store: InMemoryGameStore;
  now: () => string;
  generateSessionId: () => string;
  turnService: TurnDecisionService;
  timerSupervisor: TimerSupervisor;
  turnTimeoutMs: number;
  sseGateway: SseBroadcastGateway;
  eventLogService: EventLogService;
};
