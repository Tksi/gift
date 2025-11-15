import { z } from '@hono/zod-openapi';
import { snapshotSchema } from './game.js';
import { playerRegistrationSchema } from './players.js';

export const createSessionBodySchema = z.object({
  players: z.array(playerRegistrationSchema).min(1).openapi({
    description: 'セッションへ参加させるプレイヤー情報の配列。2〜7 名を想定。',
  }),
  seed: z.string().min(1).optional().openapi({
    description: '任意の乱数シード文字列。同じシードで山札構成を再現します。',
  }),
});

export const sessionResponseSchema = z.object({
  session_id: z.string().openapi({
    description: '作成されたセッションの識別子。',
  }),
  state_version: z.string().openapi({
    description: '状態ストアのバージョン。楽観的排他や再取得の目印です。',
  }),
  state: snapshotSchema.openapi({
    description: '現在のゲームスナップショット全体。',
  }),
});

export const errorResponseSchema = z.object({
  error: z
    .object({
      code: z.string().openapi({
        description: 'アプリケーション固有のエラーコード。',
      }),
      message: z.string().openapi({
        description: 'エラーの詳細メッセージ。',
      }),
    })
    .openapi({
      description: 'エラー情報オブジェクト。',
    }),
});

const turnActionSchema = z.enum(['placeChip', 'takeCard']);

export const sessionActionBodySchema = z.object({
  command_id: z.string().min(1).openapi({
    description: '冪等制御のためにクライアントが付与するコマンドID。',
  }),
  state_version: z.string().min(1).openapi({
    description: 'クライアントが保持する最新状態バージョン。',
  }),
  player_id: z.string().min(1).openapi({
    description: 'アクションを実行するプレイヤーID。',
  }),
  action: turnActionSchema.openapi({
    description: '実行するアクション種別。placeChip または takeCard。',
  }),
});

export const sessionActionResponseSchema = sessionResponseSchema.extend({
  turn_context: z
    .object({
      turn: z.number().int().min(0).openapi({
        description: '現在のターン番号。',
      }),
      current_player_id: z.string().openapi({
        description: '現在の手番プレイヤーID。',
      }),
      card_in_center: z.number().int().min(0).nullable().openapi({
        description: '中央に表向きのカード番号。カードが無いときは null。',
      }),
      awaiting_action: z.boolean().openapi({
        description: '手番プレイヤーのアクション待ちかどうか。',
      }),
      central_pot: z.number().int().min(0).openapi({
        description: '中央ポットに積まれているチップ数。',
      }),
      chips: z.record(z.string(), z.number().int().min(0)).openapi({
        description: '各プレイヤーの所持チップ数マップ。',
      }),
    })
    .openapi({
      description: 'UI が即時に参照できるターン状況の要約。',
    }),
});
