import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startRematch } from './rematchFetcher';

// fetcher をモック
vi.mock('./fetcher', () => ({
  fetcher: {
    sessions: {
      ':sessionId': {
        rematch: {
          $post: vi.fn(),
        },
      },
    },
  },
}));

// モックされた fetcher をインポート
import { fetcher } from './fetcher';

describe('rematchFetcher', () => {
  const mockPost = vi.mocked(
    fetcher.sessions[':sessionId'].rematch.$post,
  ) as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startRematch', () => {
    const sessionId = 'test-session-id';

    describe('正常系', () => {
      it('再戦を正常に開始できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-2',
          state: {
            sessionId: 'test-session-id',
            phase: 'setup',
            players: [
              { id: 'player-1', displayName: 'プレイヤー1' },
              { id: 'player-2', displayName: 'プレイヤー2' },
            ],
            chips: { 'player-1': 11, 'player-2': 11 },
            hands: { 'player-1': [], 'player-2': [] },
            centralPot: 0,
            turnState: {
              turn: 1,
              currentPlayerId: 'player-1',
              currentPlayerIndex: 0,
              cardInCenter: 20,
              awaitingAction: true,
              deadline: '2025-01-01T00:00:30.000Z',
            },
            finalResults: null,
          },
        };

        mockPost.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await startRematch(sessionId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.session_id).toBe('test-session-id');
          expect(result.data.state.phase).toBe('setup');
          expect(result.data.state.players).toHaveLength(2);
          // チップが初期値に戻っている
          expect(result.data.state.chips['player-1']).toBe(11);
          expect(result.data.state.chips['player-2']).toBe(11);
          // 手札がクリアされている
          expect(result.data.state.hands['player-1']).toEqual([]);
          expect(result.data.state.hands['player-2']).toEqual([]);
          // 結果がクリアされている
          expect(result.data.state.finalResults).toBeNull();
        }

        expect(mockPost).toHaveBeenCalledWith({
          param: { sessionId: 'test-session-id' },
        });
      });
    });

    describe('エラー系', () => {
      it('404 エラー時にエラー情報を返す（セッションが見つからない）', async () => {
        mockPost.mockResolvedValueOnce({
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

        const result = await startRematch(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_FOUND');
          expect(result.status).toBe(404);
        }
      });

      it('422 エラー時にエラー情報を返す（ゲームが終了していない）', async () => {
        mockPost.mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: () =>
            Promise.resolve({
              error: {
                code: 'SESSION_NOT_COMPLETED',
                message:
                  'Session must be in completed state to start a rematch',
              },
            }),
        });

        const result = await startRematch(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_COMPLETED');
          expect(result.status).toBe(422);
        }
      });

      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        mockPost.mockRejectedValueOnce(new Error('Network error'));

        const result = await startRematch(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.status).toBe(0);
        }
      });
    });
  });
});
