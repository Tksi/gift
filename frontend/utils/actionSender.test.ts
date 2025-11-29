import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCommandId, sendAction } from './actionSender';

// fetcher をモック
vi.mock('./fetcher', () => ({
  fetcher: {
    sessions: {
      ':sessionId': {
        actions: {
          $post: vi.fn(),
        },
      },
    },
  },
}));

// モックされた fetcher をインポート
import { fetcher } from './fetcher';

describe('actionSender', () => {
  const mockPost = vi.mocked(
    fetcher.sessions[':sessionId'].actions.$post,
  ) as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendAction', () => {
    const baseParams = {
      sessionId: 'test-session-id',
      commandId: 'test-command-id',
      stateVersion: 'version-1',
      playerId: 'player-1',
      action: 'placeChip' as const,
    };

    describe('正常系', () => {
      it('placeChip アクションを正常に送信できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-2',
          state: { phase: 'running' },
          turn_context: { turn: 1 },
        };

        mockPost.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await sendAction(baseParams);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockResponseData);
        }

        expect(mockPost).toHaveBeenCalledWith({
          param: { sessionId: 'test-session-id' },
          json: {
            command_id: 'test-command-id',
            state_version: 'version-1',
            player_id: 'player-1',
            action: 'placeChip',
          },
        });
      });

      it('takeCard アクションを正常に送信できる', async () => {
        const mockResponseData = {
          session_id: 'test-session-id',
          state_version: 'version-2',
          state: { phase: 'running' },
          turn_context: { turn: 2 },
        };

        mockPost.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponseData),
        });

        const result = await sendAction({ ...baseParams, action: 'takeCard' });

        expect(result.success).toBe(true);
        expect(mockPost).toHaveBeenCalledWith(
          expect.objectContaining({
            json: expect.objectContaining({ action: 'takeCard' }),
          }),
        );
      });
    });

    describe('エラー系', () => {
      it('404 エラー時にエラー情報を返す（セッションが見つからない）', async () => {
        mockPost.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({
              error: { code: 'SESSION_NOT_FOUND', message: 'Not found' },
            }),
        });

        const result = await sendAction(baseParams);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('SESSION_NOT_FOUND');
          expect(result.status).toBe(404);
          expect(result.isVersionConflict).toBe(false);
        }
      });

      it('409 エラー時にバージョン競合フラグが true になる', async () => {
        mockPost.mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              error: { code: 'VERSION_MISMATCH', message: 'Version conflict' },
            }),
        });

        const result = await sendAction(baseParams);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('VERSION_MISMATCH');
          expect(result.status).toBe(409);
          expect(result.isVersionConflict).toBe(true);
        }
      });

      it('422 エラー時にエラーコードを返す', async () => {
        mockPost.mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: () =>
            Promise.resolve({
              error: { code: 'NOT_YOUR_TURN', message: 'Not your turn' },
            }),
        });

        const result = await sendAction(baseParams);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NOT_YOUR_TURN');
          expect(result.status).toBe(422);
          expect(result.isVersionConflict).toBe(false);
        }
      });

      it('ネットワークエラー時に NETWORK_ERROR を返す', async () => {
        mockPost.mockRejectedValueOnce(new Error('Network error'));

        const result = await sendAction(baseParams);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NETWORK_ERROR');
          expect(result.status).toBe(0);
          expect(result.isVersionConflict).toBe(false);
        }
      });
    });
  });

  describe('generateCommandId', () => {
    it('UUID 形式のコマンド ID を生成する', () => {
      const commandId = generateCommandId();

      // UUID v4 の正規表現パターン
      const uuidPattern =
        /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
      expect(commandId).toMatch(uuidPattern);
    });

    it('呼び出しごとに異なる ID を生成する', () => {
      const id1 = generateCommandId();
      const id2 = generateCommandId();

      expect(id1).not.toBe(id2);
    });
  });
});
