import { beforeEach, describe, expect, it, vi } from 'vitest';
import { joinSession } from './joinFetcher';

// fetcher をモック
vi.mock('./fetcher', () => ({
  fetcher: {
    sessions: {
      ':sessionId': {
        join: {
          $post: vi.fn(),
        },
      },
    },
  },
}));

// モックされた fetcher をインポート
import { fetcher } from './fetcher';

describe('joinFetcher', () => {
  const mockPost = vi.mocked(
    fetcher.sessions[':sessionId'].join.$post,
  ) as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('joinSession', () => {
    const sessionId = 'test-session-id';
    const displayName = 'プレイヤー1';

    describe('正常系', () => {
      it('セッションに正常に参加できる（プレイヤーIDは自動生成）', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-1',
          state: {
            sessionId: 'test-session-id',
            phase: 'waiting',
            players: [{ id: 'player_123_abc', displayName: 'プレイヤー1' }],
          },
        };

        mockPost.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await joinSession(sessionId, displayName);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.session_id).toBe('test-session-id');
          expect(result.data.state.players).toHaveLength(1);
          // player 情報が付与されている
          expect(result.data.player.displayName).toBe('プレイヤー1');
          expect(result.data.player.id).toMatch(/^player_\d+_[a-z0-9]+$/);
        }

        // プレイヤー ID が自動生成されている
        expect(mockPost).toHaveBeenCalledWith({
          param: { sessionId: 'test-session-id' },
          json: {
            player_id: expect.stringMatching(/^player_\d+_[a-z0-9]+$/),
            display_name: 'プレイヤー1',
          },
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

        const result = await joinSession(sessionId, displayName);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_FOUND');
          expect(result.status).toBe(404);
        }
      });

      it('409 エラー時にエラー情報を返す（プレイヤーID重複）', async () => {
        mockPost.mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              error: {
                code: 'PLAYER_ID_NOT_UNIQUE',
                message: 'Player id is already taken',
              },
            }),
        });

        const result = await joinSession(sessionId, displayName);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('PLAYER_ID_NOT_UNIQUE');
          expect(result.status).toBe(409);
        }
      });

      it('422 エラー時にエラー情報を返す（参加不可状態）', async () => {
        mockPost.mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: () =>
            Promise.resolve({
              error: {
                code: 'SESSION_NOT_JOINABLE',
                message: 'Session is not in waiting phase',
              },
            }),
        });

        const result = await joinSession(sessionId, displayName);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_JOINABLE');
          expect(result.status).toBe(422);
        }
      });

      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        mockPost.mockRejectedValueOnce(new Error('Network error'));

        const result = await joinSession(sessionId, displayName);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.status).toBe(0);
        }
      });
    });
  });
});
