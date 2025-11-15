import { z } from '@hono/zod-openapi';

export const playerRegistrationSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'Player id must include alphanumeric characters, underscore, or hyphen.',
    })
    .openapi({
      description:
        '英数字とアンダースコア・ハイフンのみ許可されるプレイヤーID。',
    }),
  display_name: z.string().min(1).max(64).openapi({
    description: 'UI 上で表示するプレイヤー名。',
  }),
});

export const playerSummarySchema = z.object({
  id: z.string().openapi({
    description: 'セッション内で一意となるプレイヤーID。',
  }),
  displayName: z.string().openapi({
    description: 'ユーザーへ提示するプレイヤー表示名。',
  }),
});

export type PlayerRegistration = z.infer<typeof playerRegistrationSchema>;
