# Research & Design Decisions

## Summary

- **Feature**: `geschenk-board-game-frontend`
- **Discovery Scope**: New Feature (greenfield)
- **Key Findings**:
  - バックエンドは Hono + OpenAPI で実装済み、`AppType` がエクスポートされており Hono RPC クライアントで型安全な通信が可能
  - SSE イベントは `state.delta`, `state.final`, `event.log`, `rule.hint`, `system.error` の5種類
  - ゲームスキーマは Zod で定義済み、フロントエンドで再利用可能

## Research Log

### Hono RPC クライアント統合

- **Context**: フロントエンドからバックエンドへの型安全な API 通信を実現する方法
- **Sources Consulted**:
  - https://hono.dev/docs/guides/rpc
  - バックエンド実装 (`src/index.ts`, `src/app.ts`)
- **Findings**:
  - `hc<AppType>` で型推論付きクライアントを生成可能
  - パスパラメータは `client.sessions[':sessionId'].$get({ param: { sessionId: 'xxx' } })` 形式
  - モノレポ構成では Hono バージョンの一致と TypeScript プロジェクト参照が必要
  - `InferRequestType`, `InferResponseType` で型推論が可能
- **Implications**:
  - バックエンドの `AppType` を直接参照するか、ビルド済み型定義を参照する構成が必要
  - Nuxt では `composables/` に API クライアントを配置し、サーバー URL は環境変数で管理

### バックエンド API 構造

- **Context**: フロントエンドが呼び出す API エンドポイントの把握
- **Sources Consulted**:
  - `backend/src/app.ts`
  - `backend/src/routes/sessions/`
  - `backend/src/schema/sessions.ts`
- **Findings**:
  - `POST /sessions` - セッション作成（2〜7名のプレイヤー情報を送信）
  - `GET /sessions/{sessionId}` - セッション情報取得
  - `GET /sessions/{sessionId}/state` - 現在のゲーム状態取得
  - `POST /sessions/{sessionId}/actions` - アクション実行（placeChip/takeCard）
  - `GET /sessions/{sessionId}/stream` - SSE ストリーム購読
  - `GET /sessions/{sessionId}/hint` - ルールヒント取得
  - `GET /sessions/{sessionId}/results` - 結果取得
- **Implications**:
  - 全エンドポイントが OpenAPI スキーマで定義済み
  - `state_version` による楽観的排他制御、`command_id` による冪等性が必須

### SSE イベント仕様

- **Context**: リアルタイム状態同期のためのイベント構造
- **Sources Consulted**:
  - `backend/src/services/sseBroadcastGateway.ts`
  - `backend/src/routes/sessions/{sessionId}/stream.get.ts`
- **Findings**:
  - イベント種別:
    - `state.delta`: 状態更新（snapshot 全体を含む）
    - `state.final`: ゲーム終了（finalResults を含む）
    - `event.log`: イベントログエントリ
    - `rule.hint`: ルールヒント更新
    - `system.error`: システムエラー
  - `Last-Event-ID` ヘッダーで未取得イベントの再送対応
  - Keep-alive は 15 秒間隔
- **Implications**:
  - EventSource API で接続し、各イベントタイプごとにハンドラを設定
  - 再接続時は `lastEventId` を保持して未取得イベントを取得

### ゲーム状態モデル

- **Context**: フロントエンドで表示・管理すべきデータ構造
- **Sources Consulted**:
  - `backend/src/schema/game.ts`
  - `backend/src/states/inMemoryGameStore.ts`
- **Findings**:
  - `GameSnapshot`: セッション全体の状態
    - `phase`: 'setup' | 'running' | 'completed'
    - `turnState`: 現在のターン情報（currentPlayerId, cardInCenter, deadline など）
    - `chips`: プレイヤーごとの所持チップ
    - `hands`: プレイヤーごとの獲得カード
    - `centralPot`: 中央ポットのチップ数
    - `deck`: 山札（残り枚数のみ表示）
  - `ScoreSummary`: 終了時の結果（順位、スコア、タイブレーク情報）
- **Implications**:
  - フロントエンドで `GameSnapshot` の型を再利用可能
  - deck の中身は非公開情報として扱う（枚数のみ表示）

## Architecture Pattern Evaluation

| Option                 | Description                                                          | Strengths                                     | Risks / Limitations               | Notes        |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------- | --------------------------------- | ------------ |
| Composables + Pinia    | Nuxt 3 標準の Composables でロジック分離、Pinia でグローバル状態管理 | Nuxt エコシステムと親和性高、型安全、SSR 対応 | Pinia 追加が必要                  | 初期検討     |
| Composables + useState | Composables と Nuxt 3 ビルトインの useState で状態管理               | シンプル、追加依存なし、SSR/CSR 対応          | DevTools サポートが限定的         | **最終選択** |
| Vuex                   | Vue 2 時代の状態管理                                                 | 実績あり                                      | Deprecated in Vue 3、Pinia が推奨 | 非推奨       |

**選択理由**: 初期検討では Pinia を推奨したが、設計フェーズで再評価し useState を採用。理由:

1. **外部依存の削減**: Pinia の追加インストールが不要
2. **シンプルさ**: ゲーム状態は単一セッションに閉じており、複雑なモジュール分割が不要
3. **SSR/CSR 互換**: useState は Nuxt 3 のビルトイン機能で SPA モードでも正常動作
4. **スコープ**: 本機能は「1 ブラウザ = 1 セッション参加」のホットシート方式で、グローバル状態の複雑性が限定的

## Design Decisions

### Decision: Hono RPC クライアントの統合方式

- **Context**: バックエンドとフロントエンドでの型共有方法
- **Alternatives Considered**:
  1. TypeScript プロジェクト参照で直接 `AppType` を参照
  2. バックエンドをビルドし `d.ts` を生成してフロントエンドにコピー
  3. OpenAPI スキーマから型を生成（openapi-typescript）
- **Selected Approach**: TypeScript プロジェクト参照で `AppType` を直接参照
- **Rationale**:
  - Hono RPC の型推論を最大限活用
  - バックエンドとフロントエンドが同一リポジトリ内
  - ビルドプロセスの複雑化を回避
- **Trade-offs**:
  - フロントエンドのビルドがバックエンドの型定義に依存
  - Hono バージョンの一致が必要
- **Follow-up**: `tsconfig.json` にプロジェクト参照を設定

### Decision: SSE 接続管理

- **Context**: リアルタイム更新のための SSE 接続ライフサイクル管理
- **Alternatives Considered**:
  1. 生の EventSource API を使用
  2. ライブラリ（eventsource-polyfill など）を使用
- **Selected Approach**: 生の EventSource API を Composable でラップ
- **Rationale**:
  - バックエンドが標準 SSE 形式で実装済み
  - 追加依存不要
  - 再接続ロジックはカスタム実装でコントロール
- **Trade-offs**:
  - ポリフィル不要（モダンブラウザ対象）
  - エラーハンドリングと再接続を自前実装
- **Follow-up**: `useGameStream` composable として実装

### Decision: 状態管理戦略

- **Context**: ゲーム状態をコンポーネント間で共有する方法
- **Alternatives Considered**:
  1. Pinia ストアでグローバル管理
  2. provide/inject でコンポーネントツリーに注入
  3. useState (Nuxt 3 built-in) で composables から共有
- **Selected Approach**: useState でゲーム状態を管理
- **Rationale**:
  - 外部依存なし（Pinia のインストール不要）
  - 複数ページ/コンポーネントからの参照が容易
  - SSR/CSR 両対応（本プロジェクトは SPA モードだが将来に備え）
  - ゲーム状態は単一セッションに閉じており、Pinia のモジュール機能は過剰
- **Trade-offs**:
  - DevTools でのデバッグは Pinia ほど強力ではない
  - 複雑なアクション管理には不向き（本機能では十分）
- **Follow-up**: `composables/useGameState.ts` で `useState<GameState>()` を実装

### Decision: マルチプレイヤー参加方式

- **Context**: 複数プレイヤーが各自のデバイスからゲームに参加する方法
- **Alternatives Considered**:
  1. ホットシート方式（1 台のデバイスで交互操作）
  2. URL パラメータ方式（`?playerId=xxx` で識別）
  3. 認証トークン方式（ログインしてプレイヤー識別）
- **Selected Approach**: URL パラメータ方式（`/game/{sessionId}?playerId={playerId}`）
- **Rationale**:
  - 各プレイヤーが個別デバイスからネットワーク越しに参加可能
  - 認証システム不要でシンプル
  - セッション作成時に各プレイヤー用の URL を生成・共有
  - playerId なしでアクセスすると観戦モード
- **Trade-offs**:
  - URL を知っていれば誰でもそのプレイヤーになりすませる（セキュリティは低い）
  - 本格的なマルチプレイヤーには認証が必要
- **Follow-up**: バックエンド API で playerId とアクション実行者の一致を検証

## Risks & Mitigations

- **Hono バージョン不一致** — フロントエンド/バックエンドで同一バージョンを使用するよう package.json で管理
- **SSE 接続の安定性** — 再接続ロジックと exponential backoff を実装、`Last-Event-ID` で欠落イベント回復
- **state_version 競合** — 競合時はエラー表示と最新状態再取得を実装
- **型定義の同期** — TypeScript プロジェクト参照により、バックエンド変更時にフロントエンドでコンパイルエラーとして検知
- **プレイヤーなりすまし** — URL 共有によるなりすましリスクは許容（カジュアルゲーム向け）、将来的に認証追加可能

## References

- [Hono RPC Documentation](https://hono.dev/docs/guides/rpc) — 型安全なクライアント生成
- [Nuxt 3 Composables](https://nuxt.com/docs/guide/directory-structure/composables) — ロジックの再利用パターン
- [Pinia](https://pinia.vuejs.org/) — Vue 3 推奨の状態管理
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — SSE クライアント API
