import { z } from '@hono/zod-openapi';
import { playerSummarySchema } from './players.js';

export const gamePhaseSchema = z
  .enum(['waiting', 'setup', 'running', 'completed'])
  .openapi({
    description:
      'ゲームの進行段階。待機中（参加待ち）、セットアップ、進行中、終了のいずれか。',
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

export const scorePlacementSchema = z
  .object({
    rank: z.number().int().min(1).openapi({
      description: '順位 (同点の場合は同じランク値)。',
    }),
    playerId: z.string().openapi({
      description: '対象プレイヤーの ID。',
    }),
    score: z.number().openapi({
      description: 'カードセットの最小値合計からチップを差し引いた最終スコア。',
    }),
    chipsRemaining: z.number().int().min(0).openapi({
      description: 'スコア計算時点で残っているチップ数。',
    }),
    cards: z.array(z.number()).openapi({
      description: 'プレイヤーが獲得したカード番号一覧 (昇順)。',
    }),
    cardSets: z.array(z.array(z.number())).openapi({
      description: '連番ごとにグルーピングされたカードセット。',
    }),
  })
  .openapi({ description: '個々のプレイヤーのスコア詳細。' });

export const scoreTieBreakSchema = z
  .object({
    reason: z.literal('chipCount').openapi({
      description: '今回適用されたタイブレーク理由。chipCount 固定。',
    }),
    tiedScore: z.number().openapi({
      description: '同点となったスコア値。',
    }),
    contenders: z.array(z.string()).openapi({
      description: '同点となったプレイヤーIDの一覧。',
    }),
    winner: z.string().nullable().openapi({
      description: 'タイブレーク後の勝者ID。同点継続の場合は null。',
    }),
  })
  .openapi({ description: '同点時のタイブレーク情報。' });

export const scoreSummarySchema = z
  .object({
    placements: z.array(scorePlacementSchema).openapi({
      description: 'スコア順に並んだプレイヤーの順位情報。',
    }),
    tieBreak: scoreTieBreakSchema.nullable().openapi({
      description: '同点発生時のタイブレーク結果。なければ null。',
    }),
  })
  .openapi({ description: 'ゲーム終了時の結果サマリー。' });

export const ruleHintSchema = z
  .object({
    text: z.string().openapi({
      description: '現在の状況に基づくヒント本文。',
    }),
    emphasis: z.enum(['info', 'warning']).openapi({
      description: 'ヒントの強調度。warning は注意喚起。',
    }),
    turn: z.number().int().min(0).openapi({
      description: 'ヒントが対象とするターン番号。',
    }),
    generated_at: z.string().openapi({
      description: 'ヒント生成時刻 (ISO8601)。',
    }),
  })
  .openapi({
    description: 'カードとチップ状況から導かれるルールヘルプ。',
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
  finalResults: scoreSummarySchema.nullable().openapi({
    description: 'ゲーム終了後の最終結果。進行中は null。',
  }),
  maxPlayers: z.number().int().min(2).max(7).openapi({
    description: 'このセッションに参加可能な最大プレイヤー数。',
  }),
});
