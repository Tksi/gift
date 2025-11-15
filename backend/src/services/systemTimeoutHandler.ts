import type { TurnDecisionService } from 'services/turnDecision.js';
import type {
  GameSnapshot,
  InMemoryGameStore,
} from 'states/inMemoryGameStore.js';

export type TimeoutCommandHandlerDependencies = {
  store: InMemoryGameStore;
  turnService: TurnDecisionService;
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
      await dependencies.turnService.applyCommand({
        sessionId,
        commandId: generateCommandId(snapshot),
        expectedVersion: envelope.version,
        playerId: 'system',
        action: 'takeCard',
      });
    } catch {
      // 最新バージョンとの差異や競合が発生した場合は黙って終了する。
    }
  };

  return handleTimeout;
};
