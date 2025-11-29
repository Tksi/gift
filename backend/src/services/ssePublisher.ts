import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

/**
 * スナップショット更新を SSE で通知する。
 * @param options 通知に利用するゲートウェイ。
 * @param options.sseGateway 送信に使用するブロードキャストゲートウェイ。
 * @param snapshot 送信する最新スナップショット。
 * @param version 対応する状態バージョン。
 */
export const publishStateEvents = (
  options: {
    sseGateway?: SseBroadcastGateway;
  },
  snapshot: GameSnapshot,
  version: string,
) => {
  const gateway = options.sseGateway;

  if (!gateway) {
    return;
  }

  gateway.publishStateDelta(snapshot.sessionId, snapshot, version);

  if (snapshot.finalResults !== null) {
    gateway.publishStateFinal(snapshot.sessionId, snapshot, version);
  }
};
