import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchState } from './stateFetcher';

// fetcher をモック
vi.mock('./fetcher', () => ({
  fetcher: {
    sessions: {
      ':sessionId': {
        state: {
          $get: vi.fn(),
        },
      },
    },
  },
}));

// モックされた fetcher をインポート
import { fetcher } from './fetcher';

describe('stateFetcher', () => {
  const mockGet = vi.mocked(
    fetcher.sessions[':sessionId'].state.$get,
  ) as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchState', () => {
    const sessionId = 'test-session-id';

    describe('正常系', () => {
      it('ゲーム状態を正常に取得できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-1',
          state: {
            sessionId: 'test-session-id',
            phase: 'running',
            centralPot: 5,
            turnState: {
              turn: 3,
              currentPlayerId: 'player-1',
              currentPlayerIndex: 0,
              cardInCenter: 15,
              awaitingAction: true,
            },
            players: [
              { id: 'player-1', displayName: 'プレイヤー1' },
              { id: 'player-2', displayName: 'プレイヤー2' },
            ],
            chips: { 'player-1': 11, 'player-2': 10 },
            hands: { 'player-1': [3, 4, 5], 'player-2': [20] },
          },
        };

        mockGet.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await fetchState(sessionId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.session_id).toBe('test-session-id');
          expect(result.data.state_version).toBe('version-1');
          expect(result.data.state.phase).toBe('running');
        }

        expect(mockGet).toHaveBeenCalledWith({
          param: { sessionId: 'test-session-id' },
        });
      });
    });

    describe('エラー系', () => {
      it('404 エラー時にエラー情報を返す（セッションが見つからない）', async () => {
        mockGet.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({
              error: {
                code: 'SESSION_NOT_FOUND',
                message: 'Session not found',
              },
            }),
        });

        const result = await fetchState(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_FOUND');
          expect(result.status).toBe(404);
        }
      });

      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        mockGet.mockRejectedValueOnce(new Error('Network error'));

        const result = await fetchState(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.status).toBe(0);
        }
      });

      it('エラーレスポンスにエラーオブジェクトがない場合に UNKNOWN_ERROR を返す', async () => {
        mockGet.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        });

        const result = await fetchState(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('UNKNOWN_ERROR');
          expect(result.status).toBe(500);
        }
      });
    });
  });
});
