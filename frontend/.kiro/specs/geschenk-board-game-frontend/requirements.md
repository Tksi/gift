# Requirements Document

## Introduction

本ドキュメントは、ボードゲーム「ゲシェンク (Geschenkt / No Thanks!)」のフロントエンド実装要件を定義します。バックエンドは既に `../backend` に Hono ベースで実装済みであり、フロントエンドは Nuxt 3 上で Hono RPC クライアントを使用してバックエンドと通信します。

## Project Description (Input)

ボードゲーム「ゲシェンク」のフロントエンドを実装したい。バックエンドはすでに ../backend に実装されている。fetch clientはhono rpcを使ってほしい

---

## Requirements

### Requirement 1: ゲームセッション作成

**Objective:** プレイヤーとして、新しいゲームセッションを作成できるようにしたい。これにより、友人とゲシェンクをプレイ開始できる。

#### Acceptance Criteria

1. When ユーザーがプレイヤー情報（2〜7名分のIDと表示名）を入力して作成ボタンをクリックする, the Frontend shall `POST /sessions` をバックエンドに送信し、セッションを作成する
2. When セッション作成が成功する, the Frontend shall ゲーム画面へ遷移し、初期ゲーム状態を表示する
3. If プレイヤー数が2名未満または7名を超える場合, the Frontend shall エラーメッセージを表示し、作成を阻止する
4. If プレイヤーIDが重複している場合, the Frontend shall 重複エラーを表示する
5. The Frontend shall Hono RPC クライアントを使用して型安全なAPI通信を行う

### Requirement 2: ゲーム状態表示

**Objective:** プレイヤーとして、現在のゲーム状態を視覚的に把握できるようにしたい。これにより、適切な判断でゲームをプレイできる。

#### Acceptance Criteria

1. The Frontend shall 中央に公開されているカード番号を表示する
2. The Frontend shall 中央ポットに積まれているチップ数を表示する
3. The Frontend shall 各プレイヤーの所持チップ数を表示する
4. The Frontend shall 各プレイヤーが獲得済みのカードを表示する
5. The Frontend shall 現在の手番プレイヤーを視覚的にハイライト表示する
6. The Frontend shall 山札の残り枚数を表示する
7. While ゲームが進行中, the Frontend shall ターン制限時間のカウントダウン（deadline）を表示する

### Requirement 3: プレイヤーアクション実行

**Objective:** 手番プレイヤーとして、チップを置く(placeChip)またはカードを取る(takeCard)アクションを実行できるようにしたい。これにより、ゲームを進行できる。

#### Acceptance Criteria

1. When 手番プレイヤーが「チップを置く」ボタンをクリックする, the Frontend shall `POST /sessions/{sessionId}/actions` に `action: "placeChip"` を送信する
2. When 手番プレイヤーが「カードを取る」ボタンをクリックする, the Frontend shall `POST /sessions/{sessionId}/actions` に `action: "takeCard"` を送信する
3. While プレイヤーのチップが0枚, the Frontend shall 「チップを置く」ボタンを無効化する
4. If アクションが競合（state_version不一致）する, the Frontend shall エラーを表示し、最新状態を再取得する
5. The Frontend shall 冪等制御のため `command_id` をリクエストに含める
6. While 手番ではないプレイヤーの場合, the Frontend shall アクションボタンを無効化する

### Requirement 4: リアルタイム状態同期

**Objective:** すべてのプレイヤーとして、他プレイヤーのアクションをリアルタイムで受信したい。これにより、ページをリロードせずにゲーム状態を最新に保てる。

#### Acceptance Criteria

1. When ゲーム画面を開く, the Frontend shall `GET /sessions/{sessionId}/stream` への SSE 接続を確立する
2. When SSE から `state.delta` イベントを受信する, the Frontend shall ゲーム状態を更新する
3. When SSE から `state.final` イベントを受信する, the Frontend shall ゲーム終了画面へ遷移する
4. When SSE から `event.log` イベントを受信する, the Frontend shall イベントログに追記する
5. If SSE 接続が切断された場合, the Frontend shall 自動的に再接続を試みる
6. The Frontend shall `Last-Event-ID` ヘッダーを使用して未取得イベントを再取得する
7. When SSE から `rule.hint` イベントを受信する, the Frontend shall ルールヒントを表示する

### Requirement 5: ゲーム結果表示

**Objective:** プレイヤーとして、ゲーム終了時に順位とスコアを確認したい。これにより、勝敗を明確に把握できる。

#### Acceptance Criteria

1. When ゲームが終了（phase: completed）する, the Frontend shall 結果画面を表示する
2. The Frontend shall 各プレイヤーのスコア（カードセットの最小値合計 - チップ数）を表示する
3. The Frontend shall 順位をランク順に表示する
4. The Frontend shall 獲得カードを連番グループ（cardSets）として視覚的に表示する
5. Where 同点（タイブレーク）が発生した場合, the Frontend shall タイブレーク理由（チップ数比較）と結果を表示する
6. The Frontend shall 新しいゲームを開始するボタンを提供する

### Requirement 6: ルールヒント表示

**Objective:** プレイヤーとして、現在の状況に基づいたルールヒントを確認したい。これにより、ゲームルールの理解を深められる。

#### Acceptance Criteria

1. When ヒント表示ボタンをクリックする, the Frontend shall `GET /sessions/{sessionId}/hint` からヒントを取得する
2. The Frontend shall ヒントのテキストを表示する
3. Where ヒントの強調度が `warning` の場合, the Frontend shall 注意喚起スタイル（例：オレンジ色）で表示する
4. The Frontend shall ヒントの生成時刻を表示する

### Requirement 7: イベントログ表示

**Objective:** プレイヤーとして、ゲーム中に発生したイベントの履歴を確認したい。これにより、ゲームの流れを追跡できる。

#### Acceptance Criteria

1. The Frontend shall イベントログをターン順に表示する
2. The Frontend shall 各イベントのアクター、アクション、タイムスタンプを表示する
3. Where チップの増減がある場合, the Frontend shall チップ差分を表示する
4. The Frontend shall 新しいイベントを自動的にログに追加する

### Requirement 8: UI/UX 基本要件

**Objective:** プレイヤーとして、直感的で使いやすいインターフェースでゲームをプレイしたい。

#### Acceptance Criteria

1. The Frontend shall モバイルフレンドリーなレスポンシブデザインを採用する
2. The Frontend shall ローディング状態を適切に表示する
3. The Frontend shall エラーメッセージをユーザーフレンドリーに表示する
4. The Frontend shall 日本語でUIテキストを表示する
5. The Frontend shall Vue 3 Composition API を使用する
6. The Frontend shall 型安全な開発（TypeScript strict mode）を維持する
