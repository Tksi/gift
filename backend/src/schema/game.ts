import { z } from '@hono/zod-openapi';
import { playerSummarySchema } from './players.js';

export const gamePhaseSchema = z
  .enum(['setup', 'running', 'completed'])
  .openapi({
    description: 'ゲームの進行段階。セットアップ、進行中、終了のいずれか。',
  });

export const turnStateSchema = z.object({
  turn: z.number().int().min(0).openapi({
    description: '現在のターン番号。0 から開始しアクションごとに加算されます。',
  }),
  currentPlayerId: z.string().openapi({
    description: '現在の手番を担当するプレイヤーID。',
  }),
  currentPlayerIndex: z.number().int().min(0).openapi({
    description: 'playerOrder 内で現在プレイヤーが位置するインデックス。',
  }),
  cardInCenter: z.number().nullable().openapi({
    description: '中央に公開されているカード番号。カードが無いときは null。',
  }),
  awaitingAction: z.boolean().openapi({
    description: 'プレイヤーのアクション待ち状態かどうか。',
  }),
  deadline: z.string().nullable().optional().openapi({
    description:
      'アクションの締切を示す ISO 8601 形式の日時。締切なしは null。',
  }),
});

export const snapshotSchema = z.object({
  sessionId: z.string().openapi({
    description: 'セッションを一意に識別する ID。',
  }),
  phase: gamePhaseSchema.openapi({
    description: 'スナップショット時点のゲーム進行段階。',
  }),
  deck: z.array(z.number()).openapi({
    description:
      '山札に残っているカード番号の配列。先頭が次にめくられるカード。',
  }),
  discardHidden: z.array(z.number()).openapi({
    description: '裏向きに取り除かれ公開されていないカード番号の配列。',
  }),
  playerOrder: z.array(z.string()).openapi({
    description: '手番順を表すプレイヤーIDの配列。',
  }),
  rngSeed: z.string().openapi({
    description: 'セットアップで使用した乱数シード文字列。',
  }),
  players: z.array(playerSummarySchema).openapi({
    description: '参加している各プレイヤーの概要情報。',
  }),
  chips: z.record(z.string(), z.number()).openapi({
    description: 'プレイヤーIDをキーにした所持チップ枚数のマップ。',
  }),
  hands: z.record(z.string(), z.array(z.number())).openapi({
    description: 'プレイヤーIDをキーにした取得済みカード番号のリスト。',
  }),
  centralPot: z.number().openapi({
    description: '中央ポットに置かれているチップ数。',
  }),
  turnState: turnStateSchema.openapi({
    description: '現在のターンに関する詳細情報。',
  }),
  createdAt: z.string().openapi({
    description: 'スナップショットが作成された日時 (ISO 8601)。',
  }),
  updatedAt: z.string().openapi({
    description: '状態が最後に更新された日時 (ISO 8601)。',
  }),
});
