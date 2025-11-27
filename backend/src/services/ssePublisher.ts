import type { RuleHintService } from 'services/ruleHintService.js';
import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

/**
 * スナップショット更新と派生するヒントを SSE で通知する。
 * @param options 通知に利用するゲートウェイやヒントサービス。
 * @param options.sseGateway 送信に使用するブロードキャストゲートウェイ。
 * @param options.ruleHints 最新ヒントを生成・キャッシュするサービス。
 * @param snapshot 送信する最新スナップショット。
 * @param version 対応する状態バージョン。
 */
export const publishStateEvents = (
  options: {
    sseGateway?: SseBroadcastGateway;
    ruleHints?: RuleHintService;
  },
  snapshot: GameSnapshot,
  version: string,
) => {
  const gateway = options.sseGateway;
  const storedHint = options.ruleHints?.refreshHint(snapshot, version) ?? null;

  if (!gateway) {
    return;
  }

  gateway.publishStateDelta(snapshot.sessionId, snapshot, version);

  if (storedHint) {
    gateway.publishRuleHint(snapshot.sessionId, {
      stateVersion: storedHint.stateVersion,
      hint: storedHint.hint,
    });
  }

  if (snapshot.finalResults !== null) {
    gateway.publishStateFinal(snapshot.sessionId, snapshot, version);
  }
};
