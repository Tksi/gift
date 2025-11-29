import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHint } from './hintFetcher';

// fetcher をモック
vi.mock('./fetcher', () => ({
  fetcher: {
    sessions: {
      ':sessionId': {
        hint: {
          $get: vi.fn(),
        },
      },
    },
  },
}));

// モックされた fetcher をインポート
import { fetcher } from './fetcher';

describe('hintFetcher', () => {
  const mockGet = vi.mocked(
    fetcher.sessions[':sessionId'].hint.$get,
  ) as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchHint', () => {
    const sessionId = 'test-session-id';

    describe('正常系', () => {
      it('ヒントを正常に取得できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-1',
          generated_from_version: 'version-1',
          hint: {
            text: 'このカードは連番になるので取得がお得です',
            emphasis: 'info' as const,
            turn: 5,
            generated_at: '2025-01-01T00:00:00.000Z',
          },
        };

        mockGet.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await fetchHint(sessionId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockResponseData);
        }

        expect(mockGet).toHaveBeenCalledWith({
          param: { sessionId: 'test-session-id' },
        });
      });

      it('warning emphasis のヒントを取得できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-1',
          generated_from_version: 'version-1',
          hint: {
            text: 'チップが残り少ないです',
            emphasis: 'warning' as const,
            turn: 10,
            generated_at: '2025-01-01T00:00:00.000Z',
          },
        };

        mockGet.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await fetchHint(sessionId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.hint.emphasis).toBe('warning');
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
                message: 'Session does not exist.',
                reason_code: 'RESOURCE_NOT_FOUND',
                instruction: 'Check the session ID.',
              },
            }),
        });

        const result = await fetchHint(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_FOUND');
          expect(result.status).toBe(404);
        }
      });

      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        mockGet.mockRejectedValueOnce(new Error('Network error'));

        const result = await fetchHint(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.status).toBe(0);
        }
      });

      it('不明なエラーレスポンス形式の場合 UNKNOWN_ERROR を返す', async () => {
        mockGet.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        });

        const result = await fetchHint(sessionId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('UNKNOWN_ERROR');
          expect(result.status).toBe(500);
        }
      });
    });
  });
});
