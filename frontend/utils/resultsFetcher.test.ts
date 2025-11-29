import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchResults } from './resultsFetcher';

// fetcher をモック
vi.mock('./fetcher', () => ({
  fetcher: {
    sessions: {
      ':sessionId': {
        results: {
          $get: vi.fn(),
        },
      },
    },
  },
}));

// モックされた fetcher をインポート
import { fetcher } from './fetcher';

describe('resultsFetcher', () => {
  const mockGet = vi.mocked(
    fetcher.sessions[':sessionId'].results.$get,
  ) as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchResults', () => {
    const sessionId = 'test-session-id';

    describe('正常系', () => {
      it('ゲーム結果を正常に取得できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          final_results: {
            placements: [
              {
                rank: 1,
                playerId: 'player1',
                score: 15,
                chipsRemaining: 3,
                cards: [3, 4, 5],
                cardSets: [[3, 4, 5]],
              },
              {
                rank: 2,
                playerId: 'player2',
                score: 25,
                chipsRemaining: 2,
                cards: [10, 20],
                cardSets: [[10], [20]],
              },
            ],
            tieBreak: null,
          },
          event_log: [],
        };

        mockGet.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await fetchResults(sessionId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.final_results.placements).toHaveLength(2);
          expect(result.data.final_results.placements[0]?.playerId).toBe(
            'player1',
          );
        }

        expect(mockGet).toHaveBeenCalledWith({
          param: { sessionId: 'test-session-id' },
        });
      });

      it('タイブレーク情報を含む結果を取得できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          final_results: {
            placements: [
              {
                rank: 1,
                playerId: 'player1',
                score: 20,
                chipsRemaining: 3,
                cards: [5, 10],
                cardSets: [[5], [10]],
              },
              {
                rank: 1,
                playerId: 'player2',
                score: 20,
                chipsRemaining: 2,
                cards: [15],
                cardSets: [[15]],
              },
            ],
            tieBreak: {
              reason: 'chipCount' as const,
              tiedScore: 20,
              contenders: ['player1', 'player2'],
              winner: 'player1',
            },
          },
          event_log: [],
        };

        mockGet.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await fetchResults(sessionId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.final_results.tieBreak).not.toBeNull();
          expect(result.data.final_results.tieBreak?.winner).toBe('player1');
        }
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

        const result = await fetchResults(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_FOUND');
          expect(result.status).toBe(404);
        }
      });

      it('409 エラー時にエラー情報を返す（ゲームが未完了）', async () => {
        mockGet.mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              error: {
                code: 'RESULT_NOT_READY',
                message: 'Session has not completed yet',
              },
            }),
        });

        const result = await fetchResults(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('RESULT_NOT_READY');
          expect(result.status).toBe(409);
        }
      });

      it('ネットワークエラー時にエラー情報を返す', async () => {
        mockGet.mockRejectedValueOnce(new Error('Network error'));

        const result = await fetchResults(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.status).toBe(0);
        }
      });

      it('不明なエラー構造の場合に UNKNOWN_ERROR を返す', async () => {
        mockGet.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        });

        const result = await fetchResults(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('UNKNOWN_ERROR');
          expect(result.status).toBe(500);
        }
      });
    });
  });
});
