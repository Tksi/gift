# Research & Design Decisions

---

**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:

- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.

---

## Summary

- **Feature**: geschenkt-board-game
- **Discovery Scope**: New Feature
- **Key Findings**:
  - Hono + TypeScript backend currently exposes only basic routes, so the Geschenkt engine must introduce clear service boundaries to remain maintainable.
  - ユーザー指示により外部 DB/Redis を使わずにプロセス内メモリで状態を保持するため、単一インスタンス動作とセッション別の排他制御を組み合わせて整合性を担保する必要がある。
  - 双方向チャネルの代わりに Server-Sent Events (SSE) でリアルタイム可視化を行い、クライアント→サーバの意思決定は HTTP API で受け付ける構成が最も単純に要件を満たす。

## Research Log

### Backend Foundation and Patterns

- **Context**: Understand existing stack conventions before adding major functionality.
- **Sources Consulted**: `backend/package.json`, `backend/src/index.ts` (no external lookup; network is restricted).
- **Findings**:
  - Backend already uses Hono with OpenAPI generation and TypeScript strict tooling.
  - Routes are organized by resource folders; there is no persistence or domain layer yet.
  - Existing logging is minimal, so new components must add structured logging hooks without assuming a framework.
- **Implications**: Adopt a modular architecture where controllers stay thin, while services encapsulate game logic and do not import Hono-specific types. Use dependency injection factories so future transports (e.g., gRPC) can reuse the same engine.

### State Persistence & Concurrency Guardrails

- **Context**: Geschenkt requires retaining deck composition, chip holdings, logs, and per-turn timers across user requests.
- **Sources Consulted**: Internal experience designing turn-based services; no external references reachable due to restricted network.
- **Findings**:
  - 本プロジェクトではデータベースを使用できないため、`Map<string, GameSession>` のようなプロセス内レジストリを authoritative ストアとして扱う。
  - 競合を避けるためにセッションごとのミューテックスと状態バージョン（ETag）を導入し、HTTP アクションごとに expectedVersion を要求する。
  - サーバ再起動でセッションが失われるため、ゲーム終了時に即座にエクスポート API を介して履歴をダウンロードさせる運用を前提とする。
- **Implications**: `InMemoryGameStore` を唯一のリポジトリとし、バージョン比較と commandId ベースの冪等性で競合を解消する。将来の永続化が必要になった場合でもポート交換で差し替え可能に保つ。

### Real-time Transport Evaluation

- **Context**: Requirements demand that every action updates visible state and logs immediately.
- **Sources Consulted**: Prior WebSocket vs SSE trade-off knowledge (no web search allowed under current sandbox).
- **Findings**:
  - ユーザー指定で WebSocket を禁止し SSE を使う必要があるため、リアルタイム配信は一方向（サーバ→クライアント）に限定される。
  - プレイヤーの意思決定は既存の HTTP POST で送信でき、SSE チャンネルは状態更新とログ通知のみに専念できる。
  - Hono には標準の `c.stream()` API があるため、外部ライブラリなしで SSE を提供できる。
- **Implications**: `SseBroadcastGateway` を実装し、各セッションに対して複数の EventSource 接続を管理。重要イベントは `ReadableStream` へ push し、バックログ再送は InMemory イベントログを利用する。

### Game Logic & Deterministic Randomness

- **Context**: Need to honor rule details (9-card removal, forced pickups, scoring) while retaining auditability.
- **Sources Consulted**: Domain knowledge of Geschenkt mechanics; internal design heuristics.
- **Findings**:
  - Deck preparation should record excluded cards for auditing but never expose them to clients until game end.
  - Force-pick and timeout rules imply a scheduler per session; `turnState.deadline` を session envelope に保持し、プロセス再起動時に TimerSupervisor が再登録できるようにする。
  - Score computation needs contiguous-run detection; representing hands as sorted arrays simplifies grouping.
- **Implications**: Build `DeckService`, `TurnDecisionService`, and `ScoreService` under a `GameLifecycleService`. Each receives deterministic RNG seeds stored alongside the session so replays prove fairness.

## Architecture Pattern Evaluation

| Option                       | Description                                                                                        | Strengths                                      | Risks / Limitations                                     | Notes                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| Hexagonal (Ports & Adapters) | Domain core (`GeschenktGameEngine`) wrapped by HTTP/WebSocket adapters and Redis persistence ports | Clear seams, testable core, transport-agnostic | Slightly higher upfront boilerplate                     | **Selected** to keep logic independent from Hono and future clients |
| Layered MVC                  | Controllers → Services → Repository stack tightly coupled to HTTP                                  | Straightforward for Hono                       | Harder to reuse for WebSocket commands; higher coupling | Rejected to avoid duplicating logic across transports               |
| Event-Driven Microservice    | Split into multiple services (game, scoring, logging) communicating via events                     | Scales for massive load                        | Overkill for current scope, higher ops overhead         | Deferred until user base justifies distributed deployment           |

## Design Decisions

### Decision: In-memory State Repository with Version Tokens

- **Context**: 外部 DB/Redis 禁止の制約下で同時操作を安全に処理する必要がある。
- **Alternatives Considered**:
  1. 単純なグローバル変数で状態を更新（ロックなし）
  2. ファイルベース永続化
- **Selected Approach**: `InMemoryGameStore` が `Map` と `Map` ベースのログを保持し、セッションごとのミューテックスと `stateVersion`（SHA1 ハッシュ）で競合を検出する。
- **Rationale**: 追加依存なく要件を満たし、永続層が必要になれば同ポートの実装差し替えで拡張できる。
- **Trade-offs**: プロセス再起動で全セッション消失、水平スケーリング不可。
- **Follow-up**: フェイルセーフとしてゲーム終了時に必ず結果エクスポートを促す UI/UX を計画する。

### Decision: SSE Broadcast + HTTP Commands

- **Context**: WebSocket が使えない前提でリアルタイム可視化 (要件5) を実現する必要がある。
- **Alternatives Considered**:
  1. ロングポーリング
  2. Client Pull（一定間隔で GET）
- **Selected Approach**: 状態更新は `/sessions/:id/stream` の SSE で push、意思決定は既存の HTTP POST を使用する組み合わせ。
- **Rationale**: SSE は実装が軽量であり、HTTP 由来のコマンドチャネルと自然に共存する。サーバ主導でタイムアウト通知も送れる。
- **Trade-offs**: クライアント→サーバ通信が HTTP に限定されるため、入力遅延時の通知は SSE メッセージ上で補完する必要がある。
- **Follow-up**: SSE 接続の再確立方法と Last-Event-ID を文書化し、イベントログから再送できるようにする。

### Decision: Deterministic Deck & Timer Service Layer

- **Context**: Requirement 1 demands reproducible deck shuffles and hidden cards; requirement 2.5 enforces forced picks on timeout.
- **Alternatives Considered**:
  1. Use `Math.random()` ad hoc
  2. Use deterministic seed stored in session metadata
- **Selected Approach**: Introduce `Randomizer` utility seeded via `crypto.randomUUID()` hashed per session; `TimerWheel` job tracks expiration and triggers forced pickup actions.
- **Rationale**: Supports auditing and replay while ensuring fairness.
- **Trade-offs**: Additional metadata management; timer processing requires worker loop.
- **Follow-up**: Evaluate migrating to serverless scheduled jobs if workload grows.

## Risks & Mitigations

- Race conditions during simultaneous actions — Mitigate with per-session mutex + optimistic locking in `TurnDecisionService` and idempotent command IDs.
- SSE disconnects causing missed updates — Mitigate via Last-Event-ID support and `/sessions/:id/state` fallback polling。
- プロセス再起動でセッション消失 — Mitigate by encouraging immediate CSV export and optionally running warm standby with shared memory replication (将来検討)。

## References

- [Hono Official Documentation](https://hono.dev) — routingとストリーミングAPI確認。
