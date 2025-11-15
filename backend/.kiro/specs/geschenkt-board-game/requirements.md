# Requirements Document

## Introduction

ボードゲーム「ゲシェンク」のデジタル実装として、プレイヤーが規定ルールに基づくセットアップ・ターン進行・スコアリングをオンラインで体験できるようにする。ゲーム管理全体を担う Geschenkt Game Engine は、公平な初期化、明確な意思決定フロー、得点計算、および状態表示を一貫して提供する必要がある。

## Requirements

### Requirement 1: ゲームセットアップ

**Objective:** As a ゲーム管理者, I want ルールどおりの初期状態を自動構築したい, so that プレイヤーが公正にゲームを開始できる。

#### Acceptance Criteria

1. When ゲームが開始準備ステージに入るとき, the Geschenkt Game Engine shall 3〜35の整数カード33枚から9枚を無作為に除外して山札を生成する。
2. When プレイヤー登録が確定したとき, the Geschenkt Game Engine shall 各プレイヤーに11枚のチップを割り当ててUIに初期所持数を表示する。
3. If プレイヤー人数が2〜7の許容範囲外で登録された場合, the Geschenkt Game Engine shall セットアップを中断し理由を提示する。
4. When 山札が準備されたとき, the Geschenkt Game Engine shall プレイヤー順序をランダムに決定して公開する。
5. When セットアップが完了したとき, the Geschenkt Game Engine shall 除外された9枚のカードを秘匿情報として保持し再表示しない。

### Requirement 2: ターン進行と意思決定

**Objective:** As a 進行管理者, I want 各ターンで公開カードとアクション選択を統制したい, so that プレイヤーが正しい順番で意思決定できる。

#### Acceptance Criteria

1. When 新しいターンが開始されたとき, the Geschenkt Game Engine shall 山札上部のカードを公開し中央列に配置する。
2. While カードが中央列に留まっている間, the Geschenkt Game Engine shall 現在のプレイヤーに「チップを1枚置く」か「カードを取る」かの選択肢のみを提示する。
3. When プレイヤーがチップを置く行動を選んだとき, the Geschenkt Game Engine shall 個人ストックから1枚を中央列へ移し次プレイヤーへターンを渡す。
4. When プレイヤーがカードを引き取る行動を選んだとき, the Geschenkt Game Engine shall 中央列のチップを全てそのプレイヤーへ移し中央列を空にする。
5. If アクティブプレイヤーが制限時間内に応答しない場合, the Geschenkt Game Engine shall カードを強制取得させ次のターンを開始する。

### Requirement 3: チップ管理と強制取得

**Objective:** As a ゲーム審判, I want チップ残量と強制行動を正しく制御したい, so that リソース管理がルールどおりに働く。

#### Acceptance Criteria

1. While プレイヤーのチップ残数が0である間, the Geschenkt Game Engine shall カード取得のみを許可する。
2. When プレイヤーが中央列からカードを取ったとき, the Geschenkt Game Engine shall 中央列の全チップをそのプレイヤーの所持チップに即時加算する。
3. When プレイヤーのチップ残数が変化したとき, the Geschenkt Game Engine shall 新しい残数を全プレイヤーにリアルタイム表示する。
4. If プレイヤーが所持チップ未満で支払いを試行した場合, the Geschenkt Game Engine shall 行動を拒否し再入力を促す。
5. When 中央列へ追加されたチップ総数が更新されたとき, the Geschenkt Game Engine shall 次のプレイヤーに累積チップ枚数を通知する。

### Requirement 4: ゲーム終了と得点計算

**Objective:** As a スコアリングモジュール, I want 正しい終局判定と得点算出を行いたい, so that 勝敗結果が透明になる。

#### Acceptance Criteria

1. When 山札が尽きて最後のカード処理が完了したとき, the Geschenkt Game Engine shall ゲームを終了状態に遷移させる。
2. When 得点計算を開始するとき, the Geschenkt Game Engine shall 各プレイヤーの保持カードを連番セットにグループ化し各セットの最小値のみをスコア対象にする。
3. When プレイヤーごとのカード合計が算出されたとき, the Geschenkt Game Engine shall 所持チップ枚数を差し引いて最終スコアを確定する。
4. If スコアが同点となった場合, the Geschenkt Game Engine shall 余剰チップが最も多いプレイヤーを勝者として扱う。
5. When 最終結果が確定したとき, the Geschenkt Game Engine shall 順位・スコア・獲得カードセットを一覧表示して履歴に保存する。

### Requirement 5: 状態可視化とイベントログ

**Objective:** As a UXオーナー, I want 常時最新の状態と説明を提示したい, so that プレイヤーが状況を誤解せずに判断できる。

#### Acceptance Criteria

1. While ゲームが進行中である間, the Geschenkt Game Engine shall 現在カード、中央チップ数、手番プレイヤー名を全参加者に表示する。
2. When プレイヤーアクションが確定したとき, the Geschenkt Game Engine shall 行動内容と結果を順序付きイベントログに追加して共有する。
3. If 無効な入力や通信エラーが検知された場合, the Geschenkt Game Engine shall 直前の確定状態にロールバックして再入力を要求する。
4. Where ルールヘルプ機能が有効な場合, the Geschenkt Game Engine shall 現在のカードとチップ状況を踏まえた要約ルールを提示する。
5. When ログ履歴が更新されたとき, the Geschenkt Game Engine shall ターン番号付きで閲覧・エクスポート可能な形式に整形する。
