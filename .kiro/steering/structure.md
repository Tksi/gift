# Project Structure

## Organization Philosophy

**機能ベース + レイヤー分離**: ルートはファイルシステムベースルーティング、ビジネスロジックは services/states レイヤーに分離。

## Directory Patterns

### Backend Routes (`backend/src/routes/`)

**Purpose**: HTTP エンドポイント定義 (ファイルシステムベースルーティング)  
**Naming**: `{method}.ts` 形式 (例: `index.post.ts`, `actions.post.ts`)  
**Pattern**:
```
routes/
  sessions/
    index.post.ts       # POST /sessions
    {sessionId}/
      index.get.ts      # GET /sessions/:sessionId
      actions.post.ts   # POST /sessions/:sessionId/actions
      *.test.ts         # コロケーションテスト
```

### Backend Services (`backend/src/services/`)

**Purpose**: ビジネスロジック・ドメインサービス  
**Pattern**: ファクトリ関数 + 依存性注入
```typescript
// 命名: create{ServiceName}
export const createChipLedger = (deps: ChipLedgerDeps) => { ... }
```

### Backend States (`backend/src/states/`)

**Purpose**: ゲーム状態管理・永続化層  
**Pattern**: In-Memory Store + Snapshot ベース

### Backend Schema (`backend/src/schema/`)

**Purpose**: Zod スキーマ定義 (API バリデーション + 型生成)  
**Pattern**: ドメイン単位でファイル分割 (`game.ts`, `players.ts`, `sessions.ts`)

### Frontend (`frontend/`)

**Pattern**: Nuxt 3 標準構成
```
frontend/
  pages/           # ファイルベースルーティング
  components/      # UI コンポーネント
  composables/     # Vue Composables
  utils/           # ユーティリティ関数
```

### Shared Types (`hc/`)

**Purpose**: バックエンド API の型定義を共有  
**Pattern**: hono/client で生成した型を frontend で参照

## Naming Conventions

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル (routes) | `{path}.{method}.ts` | `index.post.ts`, `hint.get.ts` |
| ファイル (services) | `camelCase.ts` | `chipLedger.ts`, `timerSupervisor.ts` |
| ファイル (test) | `*.test.ts` (コロケーション) | `chipLedger.test.ts` |
| 関数 (factory) | `create{Name}` | `createApp`, `createInMemoryGameStore` |
| 型 (interface) | `PascalCase` | `GameSnapshot`, `SessionEnvelope` |

## Import Organization

```typescript
// 1. Node.js 標準モジュール
import { randomUUID } from 'node:crypto';

// 2. 外部ライブラリ
import { OpenAPIHono } from '@hono/zod-openapi';

// 3. 内部モジュール (baseUrl からの相対)
import { createChipLedger } from 'services/chipLedger.js';
import type { GameSnapshot } from 'states/inMemoryGameStore.js';

// 4. 型のみのインポートは `import type` を使用
import type { SessionEnv } from 'routes/sessions/types.js';
```

**Path Aliases**:
- Backend: `baseUrl: ./src` (tsconfig.json)
- Frontend: `@hc` → `../hc`

## Code Organization Principles

1. **ルート層は薄く**: HTTP 処理のみ、ビジネスロジックは services へ
2. **依存性注入**: ファクトリ関数でテスト容易性確保
3. **テストコロケーション**: 実装と同一ディレクトリに配置
4. **型優先**: Zod スキーマから型を推論 (`z.infer<typeof schema>`)

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
