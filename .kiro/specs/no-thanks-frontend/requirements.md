# Requirements Document

## Introduction

No Thanks! ボードゲームのWebフロントエンド実装。Nuxt 3 + Vue 3 + Tailwind CSS を用いて、バックエンド API (Hono) と連携し、リアルタイムなマルチプレイ体験を提供する SPA を構築する。hono/client (hc) による型安全な API クライアントと SSE によるリアルタイム状態同期を実現する。

## Project Description (Input)
No Thanks!のフロントエンドの実装

## Requirements

### Requirement 1: ゲームセッション作成
**Objective:** プレイヤーとして、新しいゲームセッションを作成し、参加者を登録したい。これによりゲームを開始できる。

#### Acceptance Criteria
1. When ユーザーがセッション作成フォームを送信した場合, the Frontend shall POST /sessions API を呼び出しセッションを作成する
2. When セッション作成が成功した場合, the Frontend shall セッション ID を含むゲーム画面へ遷移する
3. When プレイヤー数が 2〜7 人の範囲外の場合, the Frontend shall エラーメッセージを表示しフォーム送信を阻止する
4. When プレイヤー ID が重複している場合, the Frontend shall バリデーションエラーを表示する
5. While セッション作成中, the Frontend shall ローディングインジケーターを表示する
6. If API からエラーレスポンスが返却された場合, the Frontend shall エラーコードに応じたメッセージを表示する

### Requirement 2: ゲーム画面表示
**Objective:** プレイヤーとして、現在のゲーム状態をリアルタイムで確認したい。これによりゲームの進行を把握できる。

#### Acceptance Criteria
1. When ゲーム画面がロードされた場合, the Frontend shall GET /sessions/{sessionId}/state API から最新状態を取得し表示する
2. The Frontend shall 中央カード、中央ポットのチップ数、各プレイヤーの所持チップ数を表示する
3. The Frontend shall 現在の手番プレイヤーを視覚的にハイライト表示する
4. The Frontend shall 各プレイヤーの獲得済みカード一覧を表示する
5. The Frontend shall ゲームフェーズ (setup, running, completed) に応じた UI 状態を表示する
6. When ゲームが完了状態の場合, the Frontend shall 最終結果画面を表示する

### Requirement 3: リアルタイム状態同期 (SSE)
**Objective:** プレイヤーとして、他プレイヤーのアクションをリアルタイムで受信したい。これにより遅延なくゲーム状態を同期できる。

#### Acceptance Criteria
1. When ゲーム画面がロードされた場合, the Frontend shall GET /sessions/{sessionId}/stream へ SSE 接続を確立する
2. When `state.delta` イベントを受信した場合, the Frontend shall ゲーム状態を更新し UI を再描画する
3. When `state.final` イベントを受信した場合, the Frontend shall ゲーム完了状態に遷移し結果を表示する
4. If SSE 接続が切断された場合, the Frontend shall 自動的に再接続を試みる
5. While 再接続中, the Frontend shall 接続状態インジケーターを表示する
6. When 再接続時, the Frontend shall Last-Event-ID を送信し未取得イベントを再取得する

### Requirement 4: プレイヤーアクション実行
**Objective:** 手番プレイヤーとして、チップを置く（パス）またはカードを取得するアクションを実行したい。これによりゲームを進行できる。

#### Acceptance Criteria
1. While 自分の手番である場合, the Frontend shall アクションボタン（チップを置く/カードを取る）を有効化する
2. While 自分の手番でない場合, the Frontend shall アクションボタンを無効化する
3. When 「チップを置く」ボタンがクリックされた場合, the Frontend shall POST /sessions/{sessionId}/actions API に placeChip アクションを送信する
4. When 「カードを取る」ボタンがクリックされた場合, the Frontend shall POST /sessions/{sessionId}/actions API に takeCard アクションを送信する
5. When チップ残量が 0 の場合, the Frontend shall 「チップを置く」ボタンを無効化しカード取得を強制する
6. If state_version の競合 (409) が発生した場合, the Frontend shall 最新状態を再取得しアクションを再試行する
7. While アクション送信中, the Frontend shall ボタンを無効化しローディング状態を表示する

### Requirement 5: ルールヒント表示
**Objective:** プレイヤーとして、現在の状況に基づくヒントを確認したい。これにより意思決定の参考にできる。

#### Acceptance Criteria
1. When ゲーム状態が更新された場合, the Frontend shall GET /sessions/{sessionId}/hint API からヒントを取得する
2. The Frontend shall ヒントテキストを UI に表示する
3. When ヒントの emphasis が "warning" の場合, the Frontend shall 警告スタイルでヒントを強調表示する
4. The Frontend shall ヒント表示/非表示のトグル機能を提供する

### Requirement 6: ゲーム結果表示
**Objective:** プレイヤーとして、ゲーム終了後に最終結果を確認したい。これにより勝敗と詳細スコアを把握できる。

#### Acceptance Criteria
1. When ゲームが完了した場合, the Frontend shall GET /sessions/{sessionId}/results API から結果を取得する
2. The Frontend shall プレイヤーの順位、スコア、残チップ数、獲得カードを表示する
3. When 同点タイブレークが発生した場合, the Frontend shall タイブレーク情報を表示する
4. The Frontend shall 勝者を視覚的にハイライト表示する
5. The Frontend shall 新しいゲームを開始するボタンを表示する

### Requirement 7: レスポンシブ UI
**Objective:** プレイヤーとして、様々なデバイスでゲームをプレイしたい。これによりモバイルでも快適にプレイできる。

#### Acceptance Criteria
1. The Frontend shall モバイル (〜640px)、タブレット (641px〜1024px)、デスクトップ (1025px〜) のブレークポイントでレイアウトを最適化する
2. The Frontend shall タッチ操作に適したボタンサイズ (最小 44x44px) を確保する
3. The Frontend shall 横向き・縦向き両方のオリエンテーションに対応する

### Requirement 8: エラーハンドリング
**Objective:** プレイヤーとして、エラー発生時に適切なフィードバックを受けたい。これにより問題を理解し対処できる。

#### Acceptance Criteria
1. If API 呼び出しがネットワークエラーで失敗した場合, the Frontend shall ネットワーク接続を確認するメッセージを表示する
2. If 404 エラーが返却された場合, the Frontend shall セッションが存在しない旨を表示しホームへの導線を提供する
3. If 422 エラーが返却された場合, the Frontend shall バリデーションエラーの詳細を表示する
4. If 409 エラーが返却された場合, the Frontend shall 状態の競合を通知し再試行を促す
5. The Frontend shall すべてのエラーメッセージを日本語で表示する
