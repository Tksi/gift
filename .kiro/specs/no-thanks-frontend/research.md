# Research & Design Decisions

## Summary
- **Feature**: `no-thanks-frontend`
- **Discovery Scope**: Extension (既存バックエンドとの統合)
- **Key Findings**:
  - hono/client (hc) による型安全な API クライアントが既に `hc/` に生成済み
  - バックエンド API は完全に型付けされており、フロントエンドで直接利用可能
  - SSE ストリームは `EventSource` を使用し、Last-Event-ID による再接続をサポート

## Research Log

### hono/client 統合パターン
- **Context**: バックエンド API との型安全な通信方法を調査
- **Sources Consulted**: 
  - https://hono.dev/docs/guides/rpc#client
  - `hc/index.d.ts` の型定義
  - `frontend/utils/fetcher.ts` の既存実装
- **Findings**:
  - `hcWithType` がコンパイル済み型で提供されている (IDE パフォーマンス最適化済み)
  - `Client` 型がすべての API エンドポイントの型情報を持つ
  - レスポンスは `res.json()` で取得し、ステータスコードで型が分岐
- **Implications**: 
  - 新規 API クライアント実装は不要
  - `fetcher.ts` を拡張して Composables から利用

### Vue Composables パターン
- **Context**: Nuxt 3 での状態管理とロジック再利用パターンを調査
- **Sources Consulted**: 
  - https://vuejs.org/guide/reusability/composables.html
  - Nuxt 3 公式ドキュメント
- **Findings**:
  - `use{Name}` 命名規則で Composable を定義
  - `ref()` でリアクティブ状態を管理し、分割代入で返却
  - `onMounted`/`onUnmounted` でライフサイクル管理
  - SSE 接続などの副作用は `onUnmounted` でクリーンアップ必須
- **Implications**: 
  - `useGameSession`, `useGameState`, `useSSE` などの Composable を作成
  - 状態は `ref()` で管理し、コンポーネント間で共有可能に

### SSE (Server-Sent Events) クライアント実装
- **Context**: リアルタイム状態同期の実装方法を調査
- **Sources Consulted**: 
  - MDN EventSource API
  - バックエンド `stream.get.ts` の実装
- **Findings**:
  - `EventSource` API でネイティブに接続可能
  - `Last-Event-ID` ヘッダーで再接続時のイベント再送をサポート
  - イベント種別: `state.delta`, `state.final`, `keepalive`
  - 15秒間隔で keep-alive が送信される
- **Implications**: 
  - カスタム再接続ロジックが必要 (exponential backoff)
  - 接続状態の UI インジケーターを実装

### バックエンド API スキーマ分析
- **Context**: フロントエンドで必要な型定義を確認
- **Sources Consulted**: 
  - `hc/index.d.ts`
  - `backend/src/schema/game.ts`
- **Findings**:
  - `GameSnapshot` 型がゲーム状態の完全な情報を持つ
  - `state_version` が ETag として状態同期に使用
  - アクションは `placeChip` | `takeCard` の 2 種類
  - エラーレスポンスは `{ error: { code, message, reason_code, instruction } }` 形式
- **Implications**: 
  - バックエンドの型をそのまま利用可能
  - 楽観的更新には `state_version` の管理が必要

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Composables + useState | Nuxt 3 標準の状態管理パターン | シンプル、SSR 非対応で問題なし、型安全 | 大規模状態には向かない | 採用: SPA モードで最適 |
| Pinia | Vue 公式状態管理ライブラリ | デバッグツール、永続化 | 追加依存、オーバーエンジニアリング | 不採用: 現時点では過剰 |
| Provide/Inject | コンポーネントツリーでの依存注入 | 疎結合 | 型推論が弱い | 部分採用: API クライアント注入 |

## Design Decisions

### Decision: Composables による機能分離
- **Context**: ゲーム状態管理、SSE 接続、API 呼び出しの責務分離
- **Alternatives Considered**:
  1. 単一の大きな Composable - シンプルだがテスト困難
  2. Pinia Store - 追加依存が必要
- **Selected Approach**: 複数の小さな Composable に分離
- **Rationale**: 
  - テスト容易性
  - 関心の分離
  - 既存の hc クライアントとの統合が自然
- **Trade-offs**: Composable 間の依存関係管理が必要
- **Follow-up**: Composable の依存関係図を設計フェーズで明確化

### Decision: SSE 接続管理のカスタム実装
- **Context**: ブラウザネイティブ EventSource vs ライブラリ
- **Alternatives Considered**:
  1. ネイティブ EventSource - 標準、依存なし
  2. sse.js 等のライブラリ - カスタムヘッダー対応
- **Selected Approach**: ネイティブ EventSource + カスタム再接続ロジック
- **Rationale**: 
  - バックエンドが標準 SSE を使用
  - 追加依存不要
  - Last-Event-ID がネイティブでサポート
- **Trade-offs**: 再接続ロジックを自前で実装する必要あり
- **Follow-up**: exponential backoff の定数を調整可能に

### Decision: エラーメッセージの日本語マッピング
- **Context**: バックエンドのエラーコードをユーザーフレンドリーなメッセージに変換
- **Alternatives Considered**:
  1. バックエンドで日本語メッセージを返す - 多言語対応が困難
  2. フロントエンドでマッピング - 柔軟性あり
- **Selected Approach**: フロントエンドでエラーコードから日本語メッセージへマッピング
- **Rationale**: 
  - i18n 対応の拡張性
  - バックエンドは言語非依存を維持
- **Trade-offs**: マッピングテーブルの保守が必要
- **Follow-up**: 必要に応じて i18n ライブラリを導入

## Risks & Mitigations
- **SSE 接続の安定性** — exponential backoff と接続状態 UI で緩和
- **状態の競合 (409)** — 自動リトライと最新状態の再取得で対応
- **型の同期** — hc の再ビルドをバックエンド変更時に自動化

## References
- [Nuxt 3 Composables](https://nuxt.com/docs/guide/directory-structure/composables) — Nuxt 3 での Composable 定義方法
- [Vue Composables](https://vuejs.org/guide/reusability/composables.html) — Vue 3 Composable のベストプラクティス
- [Hono RPC Client](https://hono.dev/docs/guides/rpc#client) — hono/client の使用方法
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — SSE の標準 API
