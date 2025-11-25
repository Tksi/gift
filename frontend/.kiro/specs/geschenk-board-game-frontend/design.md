# Design Document: ゲシェンク ボードゲーム フロントエンド

## Overview

**Purpose**: ボードゲーム「ゲシェンク (Geschenkt / No Thanks!)」のウェブフロントエンドを提供し、プレイヤーがリアルタイムでゲームをプレイできる体験を実現する。

**Users**: ゲシェンクをプレイしたい2〜7名のプレイヤーが、同一ネットワーク上またはインターネット経由でゲームセッションに参加し、ターン制のゲームを進行する。

**Impact**: 既存のバックエンド API（Hono ベース）と連携し、Nuxt 3 フロントエンドからセッション作成、アクション実行、リアルタイム状態同期を行う。

### Goals

- Hono RPC クライアントを使用した型安全なバックエンド通信
- SSE によるリアルタイムゲーム状態同期
- レスポンシブで直感的なゲーム UI
- TypeScript strict mode による堅牢な型安全性

### Non-Goals

- ユーザー認証・アカウント管理（現フェーズではセッションベースのみ）
- ゲームロジックのフロントエンド実装（バックエンドに委譲）
- オフライン対応
- 国際化（日本語のみ）

---

## Architecture

### Architecture Pattern & Boundary Map

```mermaid
graph TB
    subgraph Frontend["Nuxt 3 Frontend"]
        subgraph Pages["Pages Layer"]
            IndexPage["pages/index.vue<br/>セッション作成"]
            GamePage["pages/game/[sessionId].vue<br/>ゲーム画面"]
        end

        subgraph Components["Components Layer"]
            GameBoard["GameBoard<br/>ゲーム盤面"]
            PlayerPanel["PlayerPanel<br/>プレイヤー情報"]
            ActionButtons["ActionButtons<br/>アクションボタン"]
            EventLog["EventLog<br/>イベント履歴"]
            ResultScreen["ResultScreen<br/>結果表示"]
        end

        subgraph Composables["Composables Layer"]
            useApi["useApi<br/>Hono RPC クライアント"]
            useGameStream["useGameStream<br/>SSE 接続管理 + 状態保持"]
            useGameActions["useGameActions<br/>アクション実行"]
        end
    end

    subgraph Backend["Backend (既存)"]
        HonoAPI["Hono API Server"]
        SSE["SSE Stream"]
    end

    Pages --> Components
    Components --> Composables
    useApi --> HonoAPI
    useGameStream --> SSE
    useGameActions --> useApi
```

**Architecture Integration**:

- **Selected pattern**: Composables による状態管理。useGameStream が SSE から受信したゲーム状態を直接リアクティブに保持し、コンポーネントへ Props 経由で渡す
- **Domain boundaries**:
  - Pages: ルーティングとレイアウト、SSE 接続のライフサイクル管理
  - Components: Props を受け取り UI を表示（状態を持たない）
  - Composables: API 通信、SSE 管理と状態保持、ビジネスロジック
- **Existing patterns preserved**: Nuxt 3 の Auto-import、Vue 3 Composition API
- **Steering compliance**: TypeScript strict mode、ESLint/Prettier による品質維持

### Technology Stack

| Layer              | Choice / Version       | Role in Feature                        | Notes                    |
| ------------------ | ---------------------- | -------------------------------------- | ------------------------ |
| Frontend Framework | Nuxt 3.19+             | SPA モード、ルーティング、Auto-import  | SSR は無効               |
| UI Framework       | Vue 3.5+               | Composition API によるリアクティブ UI  | `<script setup>` 記法    |
| State Management   | useGameStream (自前)   | SSE から受信した状態をリアクティブ保持 | Composable 内で Ref 管理 |
| API Client         | Hono RPC (hono/client) | 型安全なバックエンド通信               | `hc<AppType>`            |
| Real-time          | EventSource (native)   | SSE によるリアルタイム更新             | 再接続ロジック自前実装   |
| Styling            | TailwindCSS            | レスポンシブデザイン                   | インストール済み         |

**状態管理の選択理由**:

useGameStream Composable 内で直接状態を保持する方式を採用:

1. **SSE との密結合**: 状態更新は SSE イベント受信時のみ発生するため、SSE 管理と状態保持を同一 Composable で行うのが自然
2. **シンプルさ**: グローバル状態管理層を別途設けず、Composable の戻り値として状態を提供
3. **Props ドリリング**: ページからコンポーネントへ Props で状態を渡すことで、データフローが明確
4. **スコープ**: 本機能は「1 ブラウザ = 1 セッション参加」で、useGameStream のインスタンスが状態を完全に管理

---

## マルチプレイヤー参加設計

### プレイヤー識別方式

本システムは「個別デバイス方式」を採用する。各プレイヤーが自分のデバイスからネットワーク越しに参加するモデル。

```mermaid
flowchart LR
    A[セッション作成者] -->|URL + playerId 共有| B[各プレイヤー]
    B --> C[/game/sessionId?playerId=xxx]
    C --> D[自分のプレイヤーとして参加<br/>手番時のみ操作可能]
```

**設計決定**:

| 項目           | 方式                                                              | 理由                                              |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| 参加方法       | URL + クエリパラメータ（`/game/{sessionId}?playerId={playerId}`） | シンプル、認証不要、各プレイヤーに固有 URL を配布 |
| プレイヤー識別 | URL の `playerId` パラメータで識別                                | 認証なしで個別デバイス参加を実現                  |
| 観戦           | `playerId` なしでアクセスすると観戦モード                         | SSE で状態をリアルタイム受信、操作不可            |
| アクション制御 | 自分が手番かつ `playerId` が一致する場合のみボタン有効            | サーバーサイドでも `playerId` を検証              |

**実装方針**:

1. **セッション作成時**: 作成者のブラウザに `playerId` を localStorage に保存し、ゲーム画面へ遷移
2. **URL 共有**: 各プレイヤーに `?playerId={playerId}` 付きの URL を配布（セッション作成画面で表示）
3. **ゲーム画面アクセス時**:
   - URL に `playerId` がある場合 → そのプレイヤーとして参加、localStorage に保存
   - `playerId` がない場合 → 観戦モード（ボタン非表示）
4. **手番制御**: `currentPlayerId === myPlayerId` の場合のみアクションボタンを有効化
5. **セキュリティ**: バックエンド API で `playerId` とアクション実行者の一致を検証

**セッション作成後の共有 UI**:

セッション作成成功時に、各プレイヤー用の参加 URL を表示:

```
プレイヤー1 (Alice): https://example.com/game/abc123?playerId=player1
プレイヤー2 (Bob):   https://example.com/game/abc123?playerId=player2
...
```

**将来の拡張**:

- QR コード表示で簡単に URL 共有
- 招待リンクの有効期限設定

---

## System Flows

### セッション作成フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Page as index.vue
    participant API as useApi
    participant Backend as Backend API
    participant Router as Nuxt Router

    User->>Page: プレイヤー情報を入力
    User->>Page: 「ゲーム開始」クリック
    Page->>Page: バリデーション（2〜7名、ID重複チェック）
    alt バリデーションエラー
        Page-->>User: エラーメッセージ表示
    else バリデーション成功
        Page->>API: createSession(players)
        API->>Backend: POST /sessions
        Backend-->>API: 201 { session_id, state }
        API-->>Page: セッション情報
        Page->>Router: /game/{sessionId} へ遷移
    end
```

### ゲームプレイフロー（アクション実行）

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Comp as ActionButtons
    participant Actions as useGameActions
    participant API as useApi
    participant Backend as Backend API
    participant Stream as useGameStream
    participant SSE as SSE Stream

    User->>Comp: 「チップを置く」または「カードを取る」
    Comp->>Actions: executeAction(action)
    Actions->>Actions: command_id 生成
    Actions->>API: postAction(sessionId, action, state_version)
    API->>Backend: POST /sessions/{sessionId}/actions
    alt 成功
        Backend-->>API: 200 { state, turn_context }
        API-->>Actions: 更新された状態
        Note right of Backend: SSE で全クライアントに配信
    else 競合 (409)
        Backend-->>API: 409 Conflict
        API-->>Actions: エラー
        Actions-->>Comp: 競合エラー表示
    end

    Backend->>SSE: state.delta イベント
    SSE->>Stream: イベント受信
    Stream->>Stream: gameState 更新
    Stream-->>Comp: リアクティブ更新
```

### SSE 接続・再接続フロー

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: connect()
    Connecting --> Connected: onopen
    Connecting --> Reconnecting: onerror
    Connected --> Disconnected: close()
    Connected --> Reconnecting: onerror/connection lost
    Reconnecting --> Connecting: exponential backoff
    Reconnecting --> Disconnected: max retries exceeded

    state Connected {
        [*] --> Listening
        Listening --> Processing: イベント受信
        Processing --> Listening: State 更新完了
    }
```

---

## Requirements Traceability

| Requirement  | Summary                            | Components             | Interfaces                 | Flows                |
| ------------ | ---------------------------------- | ---------------------- | -------------------------- | -------------------- |
| 1.1          | プレイヤー情報入力・セッション作成 | SessionForm, index.vue | useApi.createSession       | セッション作成フロー |
| 1.2          | 作成成功時のゲーム画面遷移         | index.vue              | Nuxt Router                | セッション作成フロー |
| 1.3, 1.4     | バリデーション（人数、ID重複）     | SessionForm            | validatePlayers            | セッション作成フロー |
| 1.5          | Hono RPC クライアント使用          | useApi                 | hc<AppType>                | 全 API 通信          |
| 2.1-2.6      | ゲーム状態表示                     | GameBoard, PlayerPanel | useGameStream.gameState    | -                    |
| 2.7          | ターン制限時間表示                 | TurnTimer              | useGameStream.gameState    | -                    |
| 3.1, 3.2     | アクション実行                     | ActionButtons          | useGameActions             | ゲームプレイフロー   |
| 3.3, 3.6     | ボタン無効化条件                   | ActionButtons          | useGameStream.gameState    | -                    |
| 3.4          | 競合エラー処理                     | useGameActions         | handleConflict             | ゲームプレイフロー   |
| 3.5          | command_id 冪等制御                | useGameActions         | generateCommandId          | ゲームプレイフロー   |
| 4.1          | SSE 接続確立                       | useGameStream          | EventSource                | SSE 接続フロー       |
| 4.2-4.4, 4.7 | SSE イベント処理                   | useGameStream          | onStateUpdate, onEventLog  | SSE 接続フロー       |
| 4.5, 4.6     | SSE 再接続                         | useGameStream          | reconnect, lastEventId     | SSE 接続フロー       |
| 5.1-5.6      | 結果表示                           | ResultScreen           | useGameStream.finalResults | -                    |
| 5.7 (追加)   | ログエクスポート（CSV/JSON）       | ResultScreen           | useApi (logs/export)       | -                    |
| 6.1-6.4      | ルールヒント表示                   | HintPanel              | useApi.getHint             | -                    |
| 7.1-7.4      | イベントログ表示                   | EventLog               | useGameStream.eventLog     | -                    |
| 8.1-8.6      | UI/UX 基本要件                     | 全コンポーネント       | -                          | -                    |

---

## Components and Interfaces

### Summary Table

| Component      | Domain/Layer | Intent                    | Req Coverage              | Key Dependencies                | Contracts      |
| -------------- | ------------ | ------------------------- | ------------------------- | ------------------------------- | -------------- |
| useApi         | Composables  | Hono RPC クライアント提供 | 1.5                       | AppType (P0)                    | Service        |
| useGameStream  | Composables  | SSE 接続管理 + 状態保持   | 2.1-2.7, 4.1-4.7, 7.1-7.4 | -                               | Service, Event |
| useGameActions | Composables  | アクション実行ロジック    | 3.1-3.5                   | useApi (P0)                     | Service        |
| SessionForm    | Components   | セッション作成フォーム    | 1.1, 1.3, 1.4             | useApi (P0)                     | -              |
| GameBoard      | Components   | ゲーム盤面表示            | 2.1-2.6                   | Props (P0)                      | -              |
| PlayerPanel    | Components   | プレイヤー情報表示        | 2.3-2.5                   | Props (P0)                      | -              |
| ActionButtons  | Components   | アクションボタン          | 3.1-3.3, 3.6              | useGameActions (P0), Props (P0) | -              |
| TurnTimer      | Components   | ターンタイマー表示        | 2.7                       | Props (P0)                      | -              |
| EventLog       | Components   | イベントログ表示          | 7.1-7.4                   | Props (P0)                      | -              |
| ResultScreen   | Components   | 結果表示                  | 5.1-5.6                   | Props (P0)                      | -              |
| HintPanel      | Components   | ルールヒント表示          | 6.1-6.4                   | useApi (P1), Props (P0)         | -              |

---

### Composables Layer

#### useApi

| Field        | Detail                                                             |
| ------------ | ------------------------------------------------------------------ |
| Intent       | Hono RPC クライアントインスタンスを提供し、型安全な API 通信を実現 |
| Requirements | 1.5                                                                |

**Responsibilities & Constraints**

- `hc<AppType>` で生成したクライアントを提供
- 環境変数からベース URL を取得
- 各コンポーネントは返却されたクライアントを直接使用

**Dependencies**

- External: `hono/client` — RPC クライアント生成 (P0)
- External: `@backend/index` — AppType 型定義 (P0)

**Contracts**: Service [x]

##### Service Interface

```typescript
import type { AppType } from '@backend/index';
import { hc } from 'hono/client';

type ApiClient = ReturnType<typeof hc<AppType>>;

function useApi(): ApiClient;
```

**Implementation Notes**

- ベース URL は `useRuntimeConfig().public.apiBase` から取得
- `hc<AppType>(baseUrl)` を返却するのみのシンプルな実装
- 呼び出し側で `client.sessions.$post(...)` のように直接 API を呼び出す

**Backend Type Definition Setup**

バックエンド型定義は TypeScript パスエイリアスで参照する：

1. **`nuxt.config.ts`** に追加：

   ```typescript
   alias: {
     '@backend': '../backend/src'
   }
   ```

2. **`tsconfig.json`** に追加：

   ```json
   {
     "compilerOptions": {
       "paths": {
         "@backend/*": ["../backend/src/*"]
       }
     }
   }
   ```

3. **`package.json`** に `hono` を追加（型定義用）：
   ```json
   {
     "dependencies": {
       "hono": "^4.x"
     }
   }
   ```

**注意**: `import type` で型のみをインポートするため、バックエンドコードはバンドルされない

**実装前の PoC 確認事項**:

型参照が正しく機能することを確認するため、実装初期に以下を検証:

1. `nuxt.config.ts` のエイリアス設定で `../backend/src` を解決可能か
2. `nuxi typecheck` が `import type { AppType }` を正しく解決するか
3. `nuxt build` でバックエンドコードがバンドルに含まれないか

代替案として、型参照が困難な場合は OpenAPI スキーマから `openapi-typescript` で型生成する方式に切り替え可能。

---

#### useGameStream

| Field        | Detail                                                     |
| ------------ | ---------------------------------------------------------- |
| Intent       | SSE 接続を管理し、リアルタイムでゲーム状態を受信・保持する |
| Requirements | 2.1-2.7, 4.1-4.7, 5.1-5.6, 7.1-7.4                         |

**Responsibilities & Constraints**

- EventSource の接続・切断ライフサイクル管理
- 各イベントタイプのハンドリング
- 再接続ロジック（exponential backoff）
- `lastEventId` による欠落イベント回復
- **ゲーム状態、イベントログ、最終結果、ヒントのリアクティブ保持**

**Dependencies**

- Inbound: GamePage — 接続開始/停止指示 (P0)
- External: EventSource API — SSE 接続 (P0)

**Contracts**: Service [x] / Event [x]

##### Service Interface

```typescript
import type {
  ScoreSummary,
  GameSnapshot,
} from '@backend/states/inMemoryGameStore';
import type { RuleHint } from '@backend/services/ruleHintService';

interface UseGameStreamOptions {
  sessionId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

/** SSE イベントログエントリ */
interface EventLogEntry {
  id: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  chipsDelta?: number;
  details?: Record<string, unknown>;
}

interface UseGameStreamReturn {
  /** 接続状態 */
  status: Ref<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>;

  /** 接続開始 */
  connect: () => void;

  /** 接続終了 */
  disconnect: () => void;

  /** 最後に受信したイベント ID */
  lastEventId: Ref<string | null>;

  // --- 状態保持 ---

  /** 現在のゲーム状態（リアクティブ） */
  gameState: Ref<GameSnapshot | null>;

  /** 状態バージョン（楽観的排他制御用） */
  stateVersion: Ref<string | null>;

  /** イベントログ */
  eventLog: Ref<EventLogEntry[]>;

  /** 最終結果（ゲーム終了時） */
  finalResults: Ref<ScoreSummary | null>;

  /** 現在のヒント */
  currentHint: Ref<RuleHint | null>;

  /** 最新のシステムエラー */
  lastSystemError: Ref<{ code: string; message: string } | null>;
}

function useGameStream(options: UseGameStreamOptions): UseGameStreamReturn;
```

##### Event Contract

- **Subscribed events**:
  - `state.delta`: ゲーム状態更新 → `gameState` と `stateVersion` を更新
  - `state.final`: ゲーム終了 → `finalResults` を設定
  - `event.log`: イベントログ追加 → `eventLog` に追加
  - `rule.hint`: ヒント更新 → `currentHint` を更新
  - `system.error`: エラー通知 → `lastSystemError` を設定
- **Ordering / delivery guarantees**: `Last-Event-ID` による順序保証

**Implementation Notes**

- 再接続は 1s, 2s, 4s, 8s, 16s の exponential backoff、最大5回
- `onbeforeunload` で接続をクリーンアップ

---

#### useGameActions

| Field        | Detail                                 |
| ------------ | -------------------------------------- |
| Intent       | ゲームアクションの実行と冪等制御を担当 |
| Requirements | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6           |

**Responsibilities & Constraints**

- アクション実行前のバリデーション
- `command_id` の生成と管理
- 競合エラー時のエラーハンドリング

**Dependencies**

- Inbound: ActionButtons — アクション実行要求 (P0)
- Outbound: useApi — API 呼び出し (P0)

**Contracts**: Service [x]

##### Service Interface

```typescript
interface UseGameActionsReturn {
  /** アクション実行中フラグ */
  isExecuting: Ref<boolean>;

  /** 最後のエラー */
  lastError: Ref<ActionError | null>;

  /** チップを置くアクション */
  placeChip: (playerId: string) => Promise<boolean>;

  /** カードを取るアクション */
  takeCard: (playerId: string) => Promise<boolean>;

  /** アクション可能判定 */
  canPlaceChip: (playerId: string) => boolean;
  canTakeCard: (playerId: string) => boolean;
}

type ActionError = {
  code: string;
  message: string;
  /** ユーザーが次に取るべき対処を示す理由コード（例: REQUEST_INVALID） */
  reasonCode: string;
  /** ユーザー向けの具体的な再入力・再試行手順 */
  instruction: string;
  isConflict: boolean;
};

/** アクション成功時のターンコンテキスト（即時 UI 更新用） */
interface TurnContext {
  turn: number;
  currentPlayerId: string;
  cardInCenter: number | null;
  awaitingAction: boolean;
  centralPot: number;
  chips: Record<string, number>;
}

function useGameActions(sessionId: string): UseGameActionsReturn;
```

**Implementation Notes**

- `command_id` は `crypto.randomUUID()` で生成
- 競合（409）時はエラーを返し、SSE による最新状態到達を待つ
- `stateVersion` は呼び出し側（ページ）から渡される

---

### Components Layer

#### SessionForm

| Field        | Detail                                             |
| ------------ | -------------------------------------------------- |
| Intent       | ゲームセッション作成のためのプレイヤー入力フォーム |
| Requirements | 1.1, 1.3, 1.4                                      |

**Responsibilities & Constraints**

- 2〜7名のプレイヤー情報入力 UI
- クライアントサイドバリデーション
- 送信状態の管理

**Implementation Notes**

- 動的にプレイヤー入力フィールドを追加/削除
- バリデーションエラーはフィールド単位で表示

---

#### GameBoard

| Field        | Detail                                               |
| ------------ | ---------------------------------------------------- |
| Intent       | ゲーム盤面全体を表示（中央カード、ポット、山札残数） |
| Requirements | 2.1, 2.2, 2.6                                        |

**Responsibilities & Constraints**

- 中央カードの数字を大きく表示
- ポットのチップ数をアイコンで視覚化
- 山札の残り枚数を表示

---

#### PlayerPanel

| Field        | Detail                                           |
| ------------ | ------------------------------------------------ |
| Intent       | 各プレイヤーの情報（チップ数、獲得カード）を表示 |
| Requirements | 2.3, 2.4, 2.5                                    |

**Responsibilities & Constraints**

- プレイヤーごとのチップ数表示
- 獲得カードを連番グループで表示
- 現在の手番プレイヤーをハイライト

---

#### ActionButtons

| Field        | Detail                                           |
| ------------ | ------------------------------------------------ |
| Intent       | 「チップを置く」「カードを取る」アクションボタン |
| Requirements | 3.1, 3.2, 3.3, 3.6                               |

**Responsibilities & Constraints**

- 自分が手番でない場合は無効化
- チップ0枚時は「チップを置く」を無効化
- 実行中はローディング表示
- 観戦モード（`myPlayerId` が null）では非表示

**Props Interface**

```typescript
interface ActionButtonsProps {
  /** 自分のプレイヤー ID（観戦モードの場合は null） */
  myPlayerId: string | null;
  /** 手番プレイヤー ID */
  currentPlayerId: string | null;
  /** 自分のチップ数 */
  myChips: number;
}
```

---

#### TurnTimer

| Field        | Detail                             |
| ------------ | ---------------------------------- |
| Intent       | ターン制限時間のカウントダウン表示 |
| Requirements | 2.7                                |

**Responsibilities & Constraints**

- `deadline` から残り時間を計算して表示
- 残り時間が少ない場合は警告色で表示

---

#### EventLog

| Field        | Detail                       |
| ------------ | ---------------------------- |
| Intent       | ゲーム中のイベント履歴を表示 |
| Requirements | 7.1, 7.2, 7.3, 7.4           |

**Responsibilities & Constraints**

- ターン順にイベントを表示
- アクター、アクション、時刻を表示
- 新規イベントは自動スクロール

---

#### ResultScreen

| Field        | Detail                       |
| ------------ | ---------------------------- |
| Intent       | ゲーム終了時の結果を表示     |
| Requirements | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6 |

**Responsibilities & Constraints**

- 順位、スコア、獲得カードを表示
- カードセットを視覚的にグループ化
- タイブレーク情報を表示（該当時）
- 新しいゲーム開始ボタンを提供
- イベントログのエクスポート機能（CSV / JSON）を提供
  - `GET /sessions/{sessionId}/logs/export.csv`
  - `GET /sessions/{sessionId}/logs/export.json`

---

#### HintPanel

| Field        | Detail                               |
| ------------ | ------------------------------------ |
| Intent       | 現在の状況に基づくルールヒントを表示 |
| Requirements | 6.1, 6.2, 6.3, 6.4                   |

**Responsibilities & Constraints**

- ヒント取得ボタンを提供
- ヒントテキストを表示
- `warning` 強調度は警告スタイルで表示

---

## Data Models

### Domain Model

```mermaid
erDiagram
    GameSession ||--o{ Player : "has"
    GameSession ||--|| TurnState : "has"
    GameSession ||--o{ EventLogEntry : "records"
    GameSession ||--o| ScoreSummary : "produces"
    Player ||--o{ Card : "holds"

    GameSession {
        string sessionId PK
        string phase
        number centralPot
        number deckCount
        string stateVersion
    }

    Player {
        string id PK
        string displayName
        number chips
    }

    TurnState {
        number turn
        string currentPlayerId FK
        number cardInCenter
        string deadline
        boolean awaitingAction
    }

    Card {
        number value
    }

    EventLogEntry {
        string id PK
        number turn
        string actor
        string action
        string timestamp
        number chipsDelta
        json details
    }

    ScoreSummary {
        json placements
        json tieBreak
    }
```

### Logical Data Model

**GameSnapshot** (バックエンドから受信):

- セッション全体の状態を表現
- `phase`: ゲーム進行状態 ('setup' | 'running' | 'completed')
- `turnState`: 現在のターン情報
- `players`: プレイヤー一覧と表示名
- `chips`: プレイヤーごとの所持チップ数
- `hands`: プレイヤーごとの獲得カード
- `centralPot`: 中央ポットのチップ数
- `deck`: 山札（フロントエンドでは length のみ使用）

**EventLogEntry**:

- `id`: イベント一意識別子
- `turn`: ターン番号
- `actor`: アクター（プレイヤー ID または 'system'）
- `action`: アクション種別
- `timestamp`: ISO 8601 形式の時刻
- `chipsDelta`: チップ増減（オプション）
- `details`: 追加メタデータ（オプション、任意のキー・値ペア）

---

## Error Handling

### Error Strategy

- API エラーはステータスコードに応じて分類
- ユーザー向けの日本語メッセージを生成
- 競合エラー（409）は自動リカバリを試行

### Error Categories and Responses

**User Errors (4xx)**:

- 422 バリデーションエラー → フィールド単位でエラーメッセージ表示
- 404 セッション未存在 → トップページへ誘導

**System Errors (5xx)**:

- 500 サーバーエラー → 「しばらく待ってから再試行してください」表示
- SSE 接続エラー → 自動再接続、最大試行後は手動再接続ボタン

**Business Logic Errors (409)**:

- state_version 競合 → 最新状態を取得し「他のプレイヤーがアクションしました」表示

### Monitoring

- コンソールログでエラー詳細を出力
- SSE 接続状態を UI に表示

---

## Testing Strategy

### Unit Tests

- `useApi`: 各 API メソッドのリクエスト/レスポンス型検証
- `useGameStream`: SSE イベント受信時の状態更新ロジック
- `useGameActions`: アクション実行可否判定、command_id 生成

### Integration Tests

- `useGameStream`: SSE イベント受信と状態更新の連携
- SessionForm → useApi → Router の遷移フロー

### E2E Tests

- セッション作成からゲーム終了までの一連のフロー
- 複数タブでの同時プレイシミュレーション
- SSE 再接続シナリオ

---

## Security Considerations

- CORS: バックエンドで許可オリジンを設定済み
- XSS: Vue の自動エスケープを活用、`v-html` は使用しない
- セッション ID は URL パラメータで公開（リンク共有でセッション参加）

---

## Performance & Scalability

- **SSE 接続数**: ブラウザごとに1接続、セッションごとに最大7接続想定
- **状態サイズ**: GameSnapshot は数KB、パフォーマンス影響なし
- **再レンダリング**: Vue の computed による最適化、useGameStream の Ref によるリアクティビティを活用
