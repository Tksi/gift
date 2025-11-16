import type { SseBroadcastGateway } from 'services/sseBroadcastGateway.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

/**
 * スナップショット更新を SSE で通知する。
 * @param gateway ブロードキャストゲートウェイ。
 * @param snapshot 送信する最新スナップショット。
 * @param version 対応する状態バージョン。
 */
export const publishStateEvents = (
  gateway: SseBroadcastGateway | undefined,
  snapshot: GameSnapshot,
  version: string,
) => {
  if (!gateway) {
    return;
  }

  gateway.publishStateDelta(snapshot.sessionId, snapshot, version);

  if (snapshot.finalResults !== null) {
    gateway.publishStateFinal(snapshot.sessionId, snapshot, version);
  }
};
