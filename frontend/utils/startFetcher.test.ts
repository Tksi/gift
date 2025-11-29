import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startGame } from './startFetcher';

// fetcher をモック
vi.mock('./fetcher', () => ({
  fetcher: {
    sessions: {
      ':sessionId': {
        start: {
          $post: vi.fn(),
        },
      },
    },
  },
}));

// モックされた fetcher をインポート
import { fetcher } from './fetcher';

describe('startFetcher', () => {
  const mockPost = vi.mocked(
    fetcher.sessions[':sessionId'].start.$post,
  ) as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startGame', () => {
    const sessionId = 'test-session-id';

    describe('正常系', () => {
      it('ゲームを正常に開始できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-1',
          state: {
            sessionId: 'test-session-id',
            phase: 'running',
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
              cardInCenter: 15,
              awaitingAction: true,
              deadline: '2025-01-01T00:00:30.000Z',
            },
          },
        };

        mockPost.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await startGame(sessionId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.session_id).toBe('test-session-id');
          expect(result.data.state.phase).toBe('running');
          expect(result.data.state.players).toHaveLength(2);
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

        const result = await startGame(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_FOUND');
          expect(result.status).toBe(404);
        }
      });

      it('422 エラー時にエラー情報を返す（開始不可状態）', async () => {
        mockPost.mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: () =>
            Promise.resolve({
              error: {
                code: 'NOT_ENOUGH_PLAYERS',
                message: 'Not enough players to start',
              },
            }),
        });

        const result = await startGame(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NOT_ENOUGH_PLAYERS');
          expect(result.status).toBe(422);
        }
      });

      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        mockPost.mockRejectedValueOnce(new Error('Network error'));

        const result = await startGame(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.status).toBe(0);
        }
      });
    });
  });
});
