# ギャップ分析レポート: geschenk-board-game-frontend

## 分析サマリー

- **スコープ**: Nuxt 3 フロントエンドの新規構築（グリーンフィールド）。バックエンド API は Hono ベースで実装済み
- **主な課題**: Hono RPC 統合の設定、SSE 再接続ロジックの実装、グローバル状態管理パターンの確立
- **推奨アプローチ**: Option B（新規コンポーネント作成）— 既存コードがほぼ空のため、設計通りに新規構築
- **工数見積**: **M（3〜7日）** — 標準的なパターンと明確な API 仕様により予測可能な実装
- **リスク**: **低〜中** — バックエンド型参照の設定確認が必要、SSE 再接続は自前実装

---

## 1. 現状調査

### 1.1 ディレクトリ構造とアセット

| ディレクトリ/ファイル | 状態          | 内容                                 |
| --------------------- | ------------- | ------------------------------------ |
| `pages/index.vue`     | ⚠️ スケルトン | `<NuxtWelcome />` のみ、置き換え必要 |
| `pages/game/`         | ❌ 未存在     | 新規作成必要                         |
| `components/`         | ❌ 空         | 全コンポーネント新規作成             |
| `composables/`        | ❌ 空         | 全 composables 新規作成              |
| `utils/`              | ❌ 空         | ヘルパー関数を必要に応じて追加       |
| `app.vue`             | ✅ 標準構成   | `<NuxtLayout>` + `<NuxtPage>`        |

### 1.2 既存設定・規約

| 項目            | 現状                | 設計との整合性                                                 |
| --------------- | ------------------- | -------------------------------------------------------------- |
| **Nuxt 3**      | v3.19.3             | ✅ 設計要件と一致                                              |
| **SSR**         | 無効 (`ssr: false`) | ✅ SPA モードで正しい                                          |
| **TypeScript**  | strict 設定済み     | ✅ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` 等 |
| **ESLint**      | カスタム設定あり    | ✅ `@typescript-eslint`, `unicorn`, `jsdoc`                    |
| **TailwindCSS** | インストール済み    | ✅ スタイリングに使用可能                                      |
| **Hono**        | ❌ 未インストール   | 追加が必要                                                     |

### 1.3 依存関係の確認

**現在の依存関係**:

```json
{
  "dependencies": {
    "@nuxt/eslint": "^1.9.0",
    "@nuxtjs/tailwindcss": "^6.14.0",
    "nuxt": "^3.19.3",
    "vue": "latest"
  }
}
```

**追加が必要な依存関係**:
| パッケージ | 理由 | 優先度 |
|-----------|------|--------|
| `hono` | Hono RPC クライアント生成に必要 | P0 |

---

## 2. 要件実現性分析

### 2.1 技術要件マッピング

| 要件                         | 技術的ニーズ                              | ギャップ             | ステータス |
| ---------------------------- | ----------------------------------------- | -------------------- | ---------- |
| **1.1-1.5** セッション作成   | フォーム UI、バリデーション、API 呼び出し | 全て新規実装         | Missing    |
| **2.1-2.7** ゲーム状態表示   | リアクティブ UI、タイマー                 | 全て新規実装         | Missing    |
| **3.1-3.6** アクション実行   | ボタン UI、冪等制御、競合処理             | 全て新規実装         | Missing    |
| **4.1-4.7** リアルタイム同期 | SSE 接続、再接続ロジック                  | 全て新規実装         | Missing    |
| **5.1-5.6** 結果表示         | スコア計算 UI、ランキング                 | 全て新規実装         | Missing    |
| **6.1-6.4** ヒント表示       | API 呼び出し、条件付きスタイル            | 全て新規実装         | Missing    |
| **7.1-7.4** イベントログ     | リスト表示、自動追加                      | 全て新規実装         | Missing    |
| **8.1-8.6** UI/UX            | レスポンシブ、ローディング、エラー        | TailwindCSS 利用可能 | Partial    |

### 2.2 ギャップカテゴリ

| カテゴリ       | 詳細                                                                |
| -------------- | ------------------------------------------------------------------- |
| **Missing**    | Hono クライアント設定、composables、components、pages               |
| **Unknown**    | バックエンド `AppType` の正確なエクスポート形式（ワークスペース外） |
| **Constraint** | TypeScript strict mode による厳格な型チェック                       |

### 2.3 複雑性シグナル

| 領域         | 複雑性 | 理由                                           |
| ------------ | ------ | ---------------------------------------------- |
| API 統合     | 低     | Hono RPC は型推論を提供、標準的なパターン      |
| SSE 接続管理 | 中     | 再接続ロジック、イベントハンドリングは自前実装 |
| 状態管理     | 低     | useState で十分、外部ライブラリ不要            |
| UI 実装      | 低〜中 | TailwindCSS で効率的に実装可能                 |
| 競合処理     | 中     | 409 エラーハンドリング、リトライロジック       |

---

## 3. 実装アプローチオプション

### Option A: 既存拡張

**該当しない** — 既存コードがほぼ存在しないため、拡張対象がありません。

---

### Option B: 新規コンポーネント作成（推奨）

**適用理由**: グリーンフィールドプロジェクトのため、設計ドキュメント通りに新規構築が最適。

#### 作成するファイル

**Composables（4ファイル）**:

- `composables/useApi.ts` — Hono RPC クライアント
- `composables/useGameState.ts` — useState によるゲーム状態管理
- `composables/useGameStream.ts` — SSE 接続管理
- `composables/useGameActions.ts` — アクション実行ロジック

**Pages（2ファイル）**:

- `pages/index.vue` — セッション作成（既存を置き換え）
- `pages/game/[sessionId].vue` — ゲーム画面

**Components（8ファイル）**:

- `components/SessionForm.vue` — プレイヤー入力フォーム
- `components/GameBoard.vue` — ゲーム盤面
- `components/PlayerPanel.vue` — プレイヤー情報
- `components/ActionButtons.vue` — アクションボタン
- `components/TurnTimer.vue` — ターンタイマー
- `components/EventLog.vue` — イベントログ
- `components/ResultScreen.vue` — 結果表示
- `components/HintPanel.vue` — ルールヒント

**設定更新（3ファイル）**:

- `package.json` — `hono` 依存追加
- `nuxt.config.ts` — エイリアス設定、環境変数
- `tsconfig.json` — パスエイリアス（必要に応じて）

#### トレードオフ

| メリット                             | デメリット                    |
| ------------------------------------ | ----------------------------- |
| ✅ 設計ドキュメントとの1:1マッピング | ❌ 初期ファイル数が多い       |
| ✅ 責務の明確な分離                  | ❌ セットアップに時間がかかる |
| ✅ テスト容易性が高い                |                               |
| ✅ 将来の拡張に対応しやすい          |                               |

---

### Option C: ハイブリッドアプローチ

**該当しない** — 既存コードがないため、ハイブリッドの必要がありません。

---

## 4. リサーチが必要な項目

| 項目                        | 詳細                             | 影響範囲                | フェーズ              |
| --------------------------- | -------------------------------- | ----------------------- | --------------------- |
| バックエンド `AppType` 形式 | エクスポート方法の確認           | `useApi.ts` 実装        | Design/Implementation |
| SSE イベント JSON 形式      | 各イベントタイプのペイロード構造 | `useGameStream.ts` 実装 | Implementation        |
| API ベース URL 設定         | 開発/本番環境での URL 管理       | `nuxt.config.ts`        | Implementation        |

---

## 5. 工数とリスク評価

### 工数見積: **M（3〜7日）**

| 理由                               |
| ---------------------------------- |
| 標準的な Nuxt 3 + Vue 3 パターン   |
| Hono RPC による型安全な API 統合   |
| SSE は自前実装だが仕様が明確       |
| TailwindCSS による効率的な UI 実装 |

### リスク評価: **低〜中**

| リスク                        | レベル | 緩和策                             |
| ----------------------------- | ------ | ---------------------------------- |
| Hono バージョン不一致         | 低     | バックエンドと同一バージョンを使用 |
| TypeScript パスエイリアス設定 | 低     | Nuxt の `alias` 設定で対応         |
| SSE 再接続の堅牢性            | 中     | exponential backoff、テスト実施    |
| バックエンド API 変更への追従 | 低     | 型エラーで即時検知                 |

---

## 6. 設計フェーズへの推奨事項

### 推奨アプローチ

**Option B: 新規コンポーネント作成**

設計ドキュメントに従い、以下の順序で実装を進めることを推奨:

1. **基盤設定**
   - `hono` パッケージのインストール
   - `nuxt.config.ts` にエイリアスと環境変数設定
   - `useApi.ts` の実装と動作確認

2. **状態管理**
   - `useGameState.ts` の実装
   - 型定義の整備

3. **コア機能**
   - `useGameStream.ts`（SSE 接続）
   - `useGameActions.ts`（アクション実行）

4. **UI 実装**
   - Pages → Components の順で実装
   - TailwindCSS でレスポンシブ対応

### 持ち越しリサーチ項目

- バックエンド `AppType` の正確なインポートパス確認
- SSE イベントペイロードの型定義確認
- 環境変数の命名規則確認（`NUXT_PUBLIC_API_BASE` など）

---

## 7. 次のステップ

1. **設計の承認**: 現在の `design.md` をレビューし、承認を実行

   ```
   # design.md の内容を確認後
   spec.json の design.approved を true に更新
   ```

2. **タスク生成**: 設計承認後に実装タスクを生成

   ```
   /kiro-spec-tasks geschenk-board-game-frontend
   ```

3. **実装開始**: タスク承認後に実装を開始
   ```
   /kiro-spec-impl geschenk-board-game-frontend
   ```

---

## 参考資料

- [Hono RPC Documentation](https://hono.dev/docs/guides/rpc)
- [Nuxt 3 Composables](https://nuxt.com/docs/guide/directory-structure/composables)
- [Vue 3 Composition API](https://vuejs.org/guide/introduction.html)
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
