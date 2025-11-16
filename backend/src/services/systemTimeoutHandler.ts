import { publishStateEvents } from 'services/ssePublisher.js';
import type { RuleHintService } from 'services/ruleHintService.js';
import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type { TurnDecisionService } from 'services/turnDecision.js';
import type {
  GameSnapshot,
  InMemoryGameStore,
} from 'states/inMemoryGameStore.js';

export type TimeoutCommandHandlerDependencies = {
  store: InMemoryGameStore;
  turnService: TurnDecisionService;
  sseGateway?: SseBroadcastGateway;
  ruleHintService?: RuleHintService;
  generateCommandId?: (snapshot: GameSnapshot) => string;
};

const defaultGenerateCommandId = (snapshot: GameSnapshot): string =>
  `system-timeout-${snapshot.turnState.turn}`;

/**
 * タイムアウト発生時に system コマンドで強制取得させるハンドラを構築する。
 * @param dependencies セッションストアとターンサービス。
 */
export const createTimeoutCommandHandler = (
  dependencies: TimeoutCommandHandlerDependencies,
) => {
  const generateCommandId =
    dependencies.generateCommandId ?? defaultGenerateCommandId;

  const handleTimeout = async (sessionId: string): Promise<void> => {
    const envelope = dependencies.store.getEnvelope(sessionId);

    if (envelope === undefined) {
      return;
    }

    const snapshot = envelope.snapshot;
    const turnState = snapshot.turnState;

    if (turnState.awaitingAction === false || turnState.cardInCenter === null) {
      return;
    }

    try {
      const result = await dependencies.turnService.applyCommand({
        sessionId,
        commandId: generateCommandId(snapshot),
        expectedVersion: envelope.version,
        playerId: 'system',
        action: 'takeCard',
      });

      const eventOptions: Parameters<typeof publishStateEvents>[0] = {};

      if (dependencies.sseGateway) {
        eventOptions.sseGateway = dependencies.sseGateway;
      }

      if (dependencies.ruleHintService) {
        eventOptions.ruleHints = dependencies.ruleHintService;
      }

      publishStateEvents(eventOptions, result.snapshot, result.version);
    } catch {
      // 最新バージョンとの差異や競合が発生した場合は黙って終了する。
    }
  };

  return handleTimeout;
};
