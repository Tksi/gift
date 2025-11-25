import { serve } from "@hono/node-server";
import { hc } from "hono/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { createMiddleware } from "hono/factory";
import { streamSSE } from "hono/streaming";

//#region src/services/errors.ts
const defaultReasonContext = {
	reason_code: "UNEXPECTED_ERROR",
	instruction: "Retry the request or contact support."
};
const reasonContextByStatus = {
	404: {
		reason_code: "RESOURCE_NOT_FOUND",
		instruction: "Verify the identifier or create a new session."
	},
	409: {
		reason_code: "STATE_CONFLICT",
		instruction: "Fetch the latest state and resend the command."
	},
	422: {
		reason_code: "REQUEST_INVALID",
		instruction: "Review the request payload and try again."
	},
	503: {
		reason_code: "SERVICE_UNAVAILABLE",
		instruction: "Wait for the service to recover and retry."
	}
};
const resolveReasonContext = (status) => reasonContextByStatus[status] ?? defaultReasonContext;
/**
* API サービスで共通利用するエラーオブジェクトを生成する。
* @param code API で返すエラーコード
* @param status HTTP ステータスコード
* @param message ユーザー向けメッセージ
*/
const createServiceError = (code, status, message) => Object.assign(new Error(message), {
	code,
	status
});
/**
* HTTP レスポンスや SSE で共通利用するエラーペイロードを構築する。
* @param input エラーコードや HTTP ステータスなどの情報。
* @param input.code 返却するアプリケーションエラーコード。
* @param input.message ユーザーへ表示する詳細メッセージ。
* @param input.status HTTP ステータスコード。
*/
const createErrorDetail = (input) => {
	const context = resolveReasonContext(input.status);
	return {
		code: input.code,
		message: input.message,
		reason_code: context.reason_code,
		instruction: context.instruction
	};
};
/**
* エラーレスポンスボディを組み立てる。
* @param input エラーの基本情報。
* @param input.code 返却するアプリケーションエラーコード。
* @param input.message ユーザーへ表示する詳細メッセージ。
* @param input.status HTTP ステータスコード。
*/
const createErrorResponseBody = (input) => ({ error: createErrorDetail(input) });

//#endregion
//#region src/routes/sessions/shared.ts
/**
* セッションエンベロープを API レスポンス形式へ整形する。
* @param envelope ストアに保存されたセッション情報。
*/
const toSessionResponse = (envelope) => ({
	session_id: envelope.snapshot.sessionId,
	state_version: envelope.version,
	state: envelope.snapshot
});
/**
* バリデーションエラーを 422 レスポンスとして返送する。
* @param c Hono コンテキスト。
* @param code エラーコード。
* @param message 詳細メッセージ。
*/
const respondValidationError = (c, code, message) => c.json(createErrorResponseBody({
	code,
	message,
	status: 422
}), 422);
/**
* リソースが見つからなかった場合に 404 レスポンスを返す。
* @param c Hono コンテキスト。
* @param code エラーコード。
* @param message 詳細メッセージ。
*/
const respondNotFound = (c, code, message) => c.json(createErrorResponseBody({
	code,
	message,
	status: 404
}), 404);

//#endregion
//#region src/routes/sessions/types.ts
/**
* 依存注入ミドルウェアを生成するファクトリ。
* createRoute の middleware プロパティで使用する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createSessionDepsMiddleware = (deps) => createMiddleware(async (c, next) => {
	c.set("deps", deps);
	await next();
});

//#endregion
//#region src/schema/players.ts
const playerRegistrationSchema = z.object({
	id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, { message: "Player id must include alphanumeric characters, underscore, or hyphen." }).openapi({ description: "英数字とアンダースコア・ハイフンのみ許可されるプレイヤーID。" }),
	display_name: z.string().min(1).max(64).openapi({ description: "UI 上で表示するプレイヤー名。" })
});
const playerSummarySchema = z.object({
	id: z.string().openapi({ description: "セッション内で一意となるプレイヤーID。" }),
	displayName: z.string().openapi({ description: "ユーザーへ提示するプレイヤー表示名。" })
});

//#endregion
//#region src/schema/game.ts
const gamePhaseSchema = z.enum([
	"setup",
	"running",
	"completed"
]).openapi({ description: "ゲームの進行段階。セットアップ、進行中、終了のいずれか。" });
const turnStateSchema = z.object({
	turn: z.number().int().min(0).openapi({ description: "現在のターン番号。0 から開始しアクションごとに加算されます。" }),
	currentPlayerId: z.string().openapi({ description: "現在の手番を担当するプレイヤーID。" }),
	currentPlayerIndex: z.number().int().min(0).openapi({ description: "playerOrder 内で現在プレイヤーが位置するインデックス。" }),
	cardInCenter: z.number().nullable().openapi({ description: "中央に公開されているカード番号。カードが無いときは null。" }),
	awaitingAction: z.boolean().openapi({ description: "プレイヤーのアクション待ち状態かどうか。" }),
	deadline: z.string().nullable().optional().openapi({ description: "アクションの締切を示す ISO 8601 形式の日時。締切なしは null。" })
});
const scorePlacementSchema = z.object({
	rank: z.number().int().min(1).openapi({ description: "順位 (同点の場合は同じランク値)。" }),
	playerId: z.string().openapi({ description: "対象プレイヤーの ID。" }),
	score: z.number().openapi({ description: "カードセットの最小値合計からチップを差し引いた最終スコア。" }),
	chipsRemaining: z.number().int().min(0).openapi({ description: "スコア計算時点で残っているチップ数。" }),
	cards: z.array(z.number()).openapi({ description: "プレイヤーが獲得したカード番号一覧 (昇順)。" }),
	cardSets: z.array(z.array(z.number())).openapi({ description: "連番ごとにグルーピングされたカードセット。" })
}).openapi({ description: "個々のプレイヤーのスコア詳細。" });
const scoreTieBreakSchema = z.object({
	reason: z.literal("chipCount").openapi({ description: "今回適用されたタイブレーク理由。chipCount 固定。" }),
	tiedScore: z.number().openapi({ description: "同点となったスコア値。" }),
	contenders: z.array(z.string()).openapi({ description: "同点となったプレイヤーIDの一覧。" }),
	winner: z.string().nullable().openapi({ description: "タイブレーク後の勝者ID。同点継続の場合は null。" })
}).openapi({ description: "同点時のタイブレーク情報。" });
const scoreSummarySchema = z.object({
	placements: z.array(scorePlacementSchema).openapi({ description: "スコア順に並んだプレイヤーの順位情報。" }),
	tieBreak: scoreTieBreakSchema.nullable().openapi({ description: "同点発生時のタイブレーク結果。なければ null。" })
}).openapi({ description: "ゲーム終了時の結果サマリー。" });
const ruleHintSchema = z.object({
	text: z.string().openapi({ description: "現在の状況に基づくヒント本文。" }),
	emphasis: z.enum(["info", "warning"]).openapi({ description: "ヒントの強調度。warning は注意喚起。" }),
	turn: z.number().int().min(0).openapi({ description: "ヒントが対象とするターン番号。" }),
	generated_at: z.string().openapi({ description: "ヒント生成時刻 (ISO8601)。" })
}).openapi({ description: "カードとチップ状況から導かれるルールヘルプ。" });
const snapshotSchema = z.object({
	sessionId: z.string().openapi({ description: "セッションを一意に識別する ID。" }),
	phase: gamePhaseSchema.openapi({ description: "スナップショット時点のゲーム進行段階。" }),
	deck: z.array(z.number()).openapi({ description: "山札に残っているカード番号の配列。先頭が次にめくられるカード。" }),
	discardHidden: z.array(z.number()).openapi({ description: "裏向きに取り除かれ公開されていないカード番号の配列。" }),
	playerOrder: z.array(z.string()).openapi({ description: "手番順を表すプレイヤーIDの配列。" }),
	rngSeed: z.string().openapi({ description: "セットアップで使用した乱数シード文字列。" }),
	players: z.array(playerSummarySchema).openapi({ description: "参加している各プレイヤーの概要情報。" }),
	chips: z.record(z.string(), z.number()).openapi({ description: "プレイヤーIDをキーにした所持チップ枚数のマップ。" }),
	hands: z.record(z.string(), z.array(z.number())).openapi({ description: "プレイヤーIDをキーにした取得済みカード番号のリスト。" }),
	centralPot: z.number().openapi({ description: "中央ポットに置かれているチップ数。" }),
	turnState: turnStateSchema.openapi({ description: "現在のターンに関する詳細情報。" }),
	createdAt: z.string().openapi({ description: "スナップショットが作成された日時 (ISO 8601)。" }),
	updatedAt: z.string().openapi({ description: "状態が最後に更新された日時 (ISO 8601)。" }),
	finalResults: scoreSummarySchema.nullable().openapi({ description: "ゲーム終了後の最終結果。進行中は null。" })
});

//#endregion
//#region src/schema/sessions.ts
const createSessionBodySchema = z.object({
	players: z.array(playerRegistrationSchema).min(1).openapi({ description: "セッションへ参加させるプレイヤー情報の配列。2〜7 名を想定。" }),
	seed: z.string().min(1).optional().openapi({ description: "任意の乱数シード文字列。同じシードで山札構成を再現します。" })
});
const sessionResponseSchema = z.object({
	session_id: z.string().openapi({ description: "作成されたセッションの識別子。" }),
	state_version: z.string().openapi({ description: "状態ストアのバージョン。楽観的排他や再取得の目印です。" }),
	state: snapshotSchema.openapi({ description: "現在のゲームスナップショット全体。" })
});
const errorResponseSchema = z.object({ error: z.object({
	code: z.string().openapi({ description: "アプリケーション固有のエラーコード。" }),
	message: z.string().openapi({ description: "エラーの詳細メッセージ。" }),
	reason_code: z.string().openapi({ description: "ユーザーが次に取るべき対処を示す理由コード。例: REQUEST_INVALID。" }),
	instruction: z.string().openapi({ description: "ユーザー向けの具体的な再入力・再試行手順。" })
}).openapi({ description: "エラー情報オブジェクト。" }) });
const turnActionSchema = z.enum(["placeChip", "takeCard"]);
const sessionActionBodySchema = z.object({
	command_id: z.string().min(1).openapi({ description: "冪等制御のためにクライアントが付与するコマンドID。" }),
	state_version: z.string().min(1).openapi({ description: "クライアントが保持する最新状態バージョン。" }),
	player_id: z.string().min(1).openapi({ description: "アクションを実行するプレイヤーID。" }),
	action: turnActionSchema.openapi({ description: "実行するアクション種別。placeChip または takeCard。" })
});
const sessionActionResponseSchema = sessionResponseSchema.extend({ turn_context: z.object({
	turn: z.number().int().min(0).openapi({ description: "現在のターン番号。" }),
	current_player_id: z.string().openapi({ description: "現在の手番プレイヤーID。" }),
	card_in_center: z.number().int().min(0).nullable().openapi({ description: "中央に表向きのカード番号。カードが無いときは null。" }),
	awaiting_action: z.boolean().openapi({ description: "手番プレイヤーのアクション待ちかどうか。" }),
	central_pot: z.number().int().min(0).openapi({ description: "中央ポットに積まれているチップ数。" }),
	chips: z.record(z.string(), z.number().int().min(0)).openapi({ description: "各プレイヤーの所持チップ数マップ。" })
}).openapi({ description: "UI が即時に参照できるターン状況の要約。" }) });
const eventLogEntrySchema = z.object({
	id: z.string().openapi({ description: "イベントログのユニーク ID。" }),
	turn: z.number().int().min(0).openapi({ description: "イベントが発生したターン番号。" }),
	actor: z.string().openapi({ description: "アクションを行ったプレイヤーまたはシステム識別子。" }),
	action: z.string().openapi({ description: "実行されたアクション名。" }),
	timestamp: z.string().openapi({ description: "ISO 8601 形式の記録時刻。" }),
	chipsDelta: z.number().optional().openapi({ description: "チップ増減がある場合、その差分値。" }),
	details: z.record(z.string(), z.unknown()).optional().openapi({ description: "任意の追加メタデータ。" })
}).openapi({ description: "イベントログ行。" });
const sessionResultsResponseSchema = z.object({
	session_id: z.string().openapi({ description: "対象セッションの ID。" }),
	final_results: scoreSummarySchema.openapi({ description: "最終スコアと順位情報。" }),
	event_log: z.array(eventLogEntrySchema).openapi({ description: "ターン順に並んだイベントログ。" })
});
const sessionHintResponseSchema = z.object({
	session_id: z.string().openapi({ description: "対象セッションの ID。" }),
	state_version: z.string().openapi({ description: "現在の状態バージョン。" }),
	generated_from_version: z.string().openapi({ description: "ヒント作成時点での状態バージョン。" }),
	hint: ruleHintSchema.openapi({ description: "最新のルールヘルプ。" })
});

//#endregion
//#region src/services/ssePublisher.ts
/**
* スナップショット更新と派生するヒントを SSE で通知する。
* @param options 通知に利用するゲートウェイやヒントサービス。
* @param options.sseGateway 送信に使用するブロードキャストゲートウェイ。
* @param options.ruleHints 最新ヒントを生成・キャッシュするサービス。
* @param snapshot 送信する最新スナップショット。
* @param version 対応する状態バージョン。
*/
const publishStateEvents = (options, snapshot, version) => {
	const gateway = options.sseGateway;
	const storedHint = options.ruleHints?.refreshHint(snapshot, version) ?? null;
	if (!gateway) return;
	gateway.publishStateDelta(snapshot.sessionId, snapshot, version);
	if (storedHint) gateway.publishRuleHint(snapshot.sessionId, {
		stateVersion: storedHint.stateVersion,
		hint: storedHint.hint
	});
	if (snapshot.finalResults !== null) gateway.publishStateFinal(snapshot.sessionId, snapshot, version);
};

//#endregion
//#region src/services/timerSupervisor.ts
const parseDeadline = (iso) => {
	const timestamp = Date.parse(iso);
	if (Number.isNaN(timestamp)) return;
	return timestamp;
};
const nowFromIso = (iso) => {
	const parsed = parseDeadline(iso);
	if (parsed === void 0) return Date.now();
	return parsed;
};
/**
* 基準時刻と制限時間から締切 ISO 文字列を算出する。
* @param baseIso ターン開始時刻。
* @param durationMs 締切までのミリ秒。
*/
const calculateTurnDeadline = (baseIso, durationMs) => new Date(nowFromIso(baseIso) + durationMs).toISOString();
/**
* ターン締切のセット/解除/復元を担うタイマー管理を構築する。
* @param dependencies ストアや setTimeout ラッパー。
*/
const createTimerSupervisor = (dependencies) => {
	const clear = (sessionId) => {
		const envelope = dependencies.store.getEnvelope(sessionId);
		if (envelope?.deadlineHandle === void 0) return;
		const turn = envelope.snapshot.turnState.turn;
		dependencies.cancel(envelope.deadlineHandle);
		delete envelope.deadlineHandle;
		delete envelope.deadlineAt;
		dependencies.monitoring?.logTimerEvent({
			sessionId,
			action: "clear",
			turn
		});
	};
	const register = (sessionId, deadlineIso) => {
		const envelope = dependencies.store.getEnvelope(sessionId);
		if (envelope === void 0) return;
		const existingHandle = envelope.deadlineHandle;
		if (existingHandle !== void 0) {
			dependencies.cancel(existingHandle);
			delete envelope.deadlineHandle;
			delete envelope.deadlineAt;
		}
		if (deadlineIso === void 0 || deadlineIso === null) return;
		const dueTime = parseDeadline(deadlineIso);
		if (dueTime === void 0) return;
		const turn = envelope.snapshot.turnState.turn;
		const delay = Math.max(0, dueTime - dependencies.now());
		envelope.deadlineHandle = dependencies.schedule(() => {
			delete envelope.deadlineHandle;
			delete envelope.deadlineAt;
			dependencies.onTimeout(sessionId);
		}, delay);
		envelope.deadlineAt = dueTime;
		dependencies.monitoring?.logTimerEvent({
			sessionId,
			action: "register",
			deadline: deadlineIso,
			turn
		});
	};
	const restore = () => {
		for (const summary of dependencies.store.listSessions()) {
			const envelope = dependencies.store.getEnvelope(summary.sessionId);
			if (envelope === void 0) continue;
			const deadline = envelope.snapshot.turnState.deadline;
			if (deadline === void 0 || deadline === null || envelope.snapshot.turnState.awaitingAction === false) {
				clear(summary.sessionId);
				continue;
			}
			register(summary.sessionId, deadline);
		}
	};
	return {
		register,
		clear,
		restore
	};
};

//#endregion
//#region src/states/setup.ts
const CARD_MIN = 3;
const CARD_MAX = 35;
const HIDDEN_CARD_COUNT = 9;
const createCardRange = () => Array.from({ length: CARD_MAX - CARD_MIN + 1 }, (_, index) => CARD_MIN + index);
const createSeed = () => randomBytes(16).toString("hex");
const createSeededRandom = (seed) => {
	let counter = 0;
	return () => {
		const hash = createHash("sha256");
		hash.update(seed);
		hash.update(counter.toString(16));
		counter += 1;
		return hash.digest().readUInt32BE(0) / 4294967295;
	};
};
const shuffle = (values, random) => {
	const items = [...values];
	for (let index = items.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1));
		const current = items[index];
		const candidate = items[swapIndex];
		if (current === void 0 || candidate === void 0) continue;
		items[index] = candidate;
		items[swapIndex] = current;
	}
	return items;
};
const assertPlayerCount = (playerIds) => {
	if (playerIds.length < 2 || playerIds.length > 7) throw new Error("Players must contain between 2 and 7 entries to satisfy setup rules.");
};
/**
* 初期デッキ順序や伏せ札、プレイヤー順のシャッフル結果を生成する。
* @param playerIds プレイヤー ID の配列（2〜7名）。
* @param options シードなどのオプション。
*/
const createSetupSnapshot = (playerIds, options = {}) => {
	assertPlayerCount(playerIds);
	const rngSeed = options.seed ?? createSeed();
	const random = createSeededRandom(rngSeed);
	const shuffledDeck = shuffle(createCardRange(), random);
	const discardHidden = shuffledDeck.slice(0, HIDDEN_CARD_COUNT);
	return {
		deck: shuffledDeck.slice(HIDDEN_CARD_COUNT),
		discardHidden,
		playerOrder: shuffle(playerIds, random),
		rngSeed
	};
};

//#endregion
//#region src/routes/sessions/index.post.ts
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 7;
const INITIAL_PLAYER_CHIPS = 11;
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createSessionRouteWithMiddleware = (deps) => createRoute({
	method: "post",
	path: "/sessions",
	description: "指定されたプレイヤー情報と任意のシード値を用いてゲームのセットアップを実行し、初期スナップショットと状態バージョンを返します。",
	middleware: [createSessionDepsMiddleware(deps)],
	request: { body: {
		required: true,
		content: { "application/json": {
			schema: createSessionBodySchema,
			example: {
				seed: "optional-seed-string",
				players: [{
					id: "alice",
					display_name: "Alice"
				}, {
					id: "bob",
					display_name: "Bob"
				}]
			}
		} },
		description: "プレイヤー ID と表示名、そして任意の乱数シード。ID は 2〜7 名、英数 + `_`/`-` のみ許可されます。"
	} },
	responses: {
		201: {
			description: "新しいセッションが作成され、初期状態が返却されました。",
			content: { "application/json": { schema: sessionResponseSchema } }
		},
		422: {
			description: "入力検証に失敗しました。プレイヤー人数や ID の重複などを `error.code` で示します。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const ensurePlayerConstraints = (players) => {
	if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return {
		ok: false,
		code: "PLAYER_COUNT_INVALID",
		message: `Players must contain between ${MIN_PLAYERS} and ${MAX_PLAYERS} entries.`
	};
	const normalized = [];
	const existing = /* @__PURE__ */ new Set();
	for (const player of players) {
		const id = player.id.trim();
		const displayName = player.display_name.trim();
		if (id.length === 0) return {
			ok: false,
			code: "PLAYER_ID_INVALID",
			message: "Player id cannot be empty."
		};
		if (displayName.length === 0) return {
			ok: false,
			code: "PLAYER_NAME_INVALID",
			message: `Player ${player.id} display name cannot be empty.`
		};
		if (existing.has(id)) return {
			ok: false,
			code: "PLAYER_ID_NOT_UNIQUE",
			message: `Player id ${id} is duplicated.`
		};
		existing.add(id);
		normalized.push({
			id,
			displayName
		});
	}
	return {
		ok: true,
		players: normalized
	};
};
const createInitialSnapshot = (sessionId, players, timestamp, seed) => {
	const setupOptions = seed === void 0 ? void 0 : { seed };
	const setup = createSetupSnapshot(players.map((player) => player.id), setupOptions);
	const chips = {};
	const hands = {};
	for (const player of players) {
		chips[player.id] = INITIAL_PLAYER_CHIPS;
		hands[player.id] = [];
	}
	const [activeCard, ...remainingDeck] = setup.deck;
	const firstPlayerIndex = 0;
	const firstPlayerId = setup.playerOrder[firstPlayerIndex] ?? players[0]?.id ?? "";
	const awaitingAction = activeCard !== void 0;
	return {
		sessionId,
		phase: "setup",
		deck: remainingDeck,
		discardHidden: setup.discardHidden,
		playerOrder: setup.playerOrder,
		rngSeed: setup.rngSeed,
		players: [...players],
		chips,
		hands,
		centralPot: 0,
		turnState: {
			turn: awaitingAction ? 1 : 0,
			currentPlayerId: firstPlayerId,
			currentPlayerIndex: firstPlayerIndex,
			cardInCenter: activeCard ?? null,
			awaitingAction
		},
		createdAt: timestamp,
		updatedAt: timestamp,
		finalResults: null
	};
};
/**
* セッション作成 POST ルートをアプリケーションへ登録する。
* @param app OpenAPIHono インスタンス。
* @param dependencies ストアや時刻生成などの依存オブジェクト。
*/
const registerSessionPostRoute = (app$1, dependencies) => {
	const route = createSessionRouteWithMiddleware(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		const payload = c.req.valid("json");
		const check = ensurePlayerConstraints(payload.players);
		if (check.ok) {
			const sessionId = deps.generateSessionId();
			const snapshot = createInitialSnapshot(sessionId, check.players, deps.now(), payload.seed);
			if (snapshot.turnState.awaitingAction) snapshot.turnState.deadline = calculateTurnDeadline(snapshot.updatedAt, deps.turnTimeoutMs);
			else snapshot.turnState.deadline = null;
			const envelope = deps.store.saveSnapshot(snapshot);
			const initialDeadline = snapshot.turnState.deadline;
			if (snapshot.turnState.awaitingAction && initialDeadline !== null && initialDeadline !== void 0) deps.timerSupervisor.register(sessionId, initialDeadline);
			else deps.timerSupervisor.clear(sessionId);
			publishStateEvents({
				sseGateway: deps.sseGateway,
				ruleHints: deps.ruleHintService
			}, envelope.snapshot, envelope.version);
			return c.json(toSessionResponse(envelope), 201);
		}
		return respondValidationError(c, check.code, check.message);
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/actions.post.ts
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createPostSessionActionRoute = (deps) => createRoute({
	method: "post",
	path: "/sessions/{sessionId}/actions",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "手番プレイヤーまたはシステムからのアクションコマンドを TurnDecisionService へ転送し、最新スナップショットと要約情報を返します。",
	request: {
		params: z.object({ sessionId: z.string().min(1).describe("アクションを送信する対象の `session_id`。") }),
		body: {
			required: true,
			content: { "application/json": {
				schema: sessionActionBodySchema,
				example: {
					command_id: "cmd-123",
					state_version: "etag-hex",
					player_id: "alice",
					action: "placeChip"
				}
			} }
		}
	},
	responses: {
		200: {
			description: "アクションが適用され、新しい状態とターン要約が返却されました。",
			content: { "application/json": { schema: sessionActionResponseSchema } }
		},
		404: {
			description: "セッションまたはプレイヤーが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		},
		409: {
			description: "`state_version` が最新と一致しない、または完了済みゲームなどのため競合しました。",
			content: { "application/json": { schema: errorResponseSchema } }
		},
		422: {
			description: "入力やチップ残量などの検証に失敗しました。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const createTurnContext = (snapshot) => ({
	turn: snapshot.turnState.turn,
	current_player_id: snapshot.turnState.currentPlayerId,
	card_in_center: snapshot.turnState.cardInCenter,
	awaiting_action: snapshot.turnState.awaitingAction,
	central_pot: snapshot.centralPot,
	chips: snapshot.chips
});
const toActionResponse = (snapshot, version) => ({
	session_id: snapshot.sessionId,
	state_version: version,
	state: snapshot,
	turn_context: createTurnContext(snapshot)
});
const isServiceError = (err) => typeof err === "object" && err !== null && "code" in err && "status" in err && typeof err.code === "string" && typeof err.status === "number";
/**
* プレイヤーアクション POST ルートを登録する。
* @param app OpenAPIHono インスタンス。
* @param dependencies セッションストアやサービス群。
*/
const registerSessionActionsPostRoute = (app$1, dependencies) => {
	const route = createPostSessionActionRoute(dependencies);
	app$1.openapi(route, async (c) => {
		const deps = c.var.deps;
		const { sessionId } = c.req.valid("param");
		const payload = c.req.valid("json");
		try {
			const result = await deps.turnService.applyCommand({
				sessionId,
				commandId: payload.command_id,
				expectedVersion: payload.state_version,
				playerId: payload.player_id,
				action: payload.action
			});
			publishStateEvents({
				sseGateway: deps.sseGateway,
				ruleHints: deps.ruleHintService
			}, result.snapshot, result.version);
			return c.json(toActionResponse(result.snapshot, result.version), 200);
		} catch (err) {
			if (isServiceError(err)) {
				if ([
					404,
					409,
					422
				].includes(err.status)) {
					const status = err.status;
					const body = createErrorResponseBody({
						code: err.code,
						message: err.message,
						status
					});
					deps.sseGateway.publishSystemError(sessionId, body.error);
					return c.json(body, status);
				}
				throw err;
			}
			throw err;
		}
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/hint.get.ts
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createGetSessionHintRoute = (deps) => createRoute({
	method: "get",
	path: "/sessions/{sessionId}/hint",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "現在のカード・チップ状況に基づくルールヘルプを返し、UI が即時に意思決定ヒントを表示できるようにします。",
	request: { params: z.object({ sessionId: z.string().min(1).describe("対象となる `session_id`。") }) },
	responses: {
		200: {
			description: "最新のルールヒントを取得できました。",
			content: { "application/json": { schema: sessionHintResponseSchema } }
		},
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const toHintPayload = (sessionId, stateVersion, stored) => ({
	session_id: sessionId,
	state_version: stateVersion,
	generated_from_version: stored.stateVersion,
	hint: {
		text: stored.hint.text,
		emphasis: stored.hint.emphasis,
		turn: stored.hint.turn,
		generated_at: stored.hint.generatedAt
	}
});
/**
* ルールヘルプ取得ルートを登録する。
* @param app OpenAPIHono インスタンス。
* @param dependencies セッションストアとサービス群。
*/
const registerSessionHintGetRoute = (app$1, dependencies) => {
	const route = createGetSessionHintRoute(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		const { sessionId } = c.req.valid("param");
		const envelope = deps.store.getEnvelope(sessionId);
		if (!envelope) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
		const cached = deps.ruleHintService.getLatestHint(sessionId);
		const latest = cached && cached.stateVersion === envelope.version ? cached : deps.ruleHintService.refreshHint(envelope.snapshot, envelope.version);
		return c.json(toHintPayload(sessionId, envelope.version, latest), 200);
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/index.get.ts
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createGetSessionRoute = (deps) => createRoute({
	method: "get",
	path: "/sessions/{sessionId}",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "既存セッションの最新スナップショットと状態バージョンを返し、クライアントが状態同期を行えるようにします。",
	request: { params: z.object({ sessionId: z.string().min(1).describe("取得対象の `session_id`。作成時にレスポンスへ含まれる値を指定します。") }) },
	responses: {
		200: {
			description: "該当セッションが見つかり、現在の状態が返却されました。",
			content: { "application/json": { schema: sessionResponseSchema } }
		},
		404: {
			description: "指定された `session_id` のデータが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* セッション取得 GET ルートをアプリケーションへ登録する。
* @param app OpenAPIHono インスタンス。
* @param dependencies ストアなどの依存オブジェクト。
*/
const registerSessionGetRoute = (app$1, dependencies) => {
	const route = createGetSessionRoute(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		const { sessionId } = c.req.valid("param");
		const envelope = deps.store.getEnvelope(sessionId);
		if (envelope) return c.json(toSessionResponse(envelope), 200);
		return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/logs/export.ts
const CSV_HEADERS = [
	"id",
	"turn",
	"actor",
	"action",
	"timestamp",
	"chipsDelta",
	"details"
];
const toCsvRow = (values) => values.map((value) => {
	if (value === void 0 || value === null) return "";
	const text = typeof value === "string" ? value : JSON.stringify(value);
	if (text.includes(",") || text.includes("\"") || text.includes("\n")) return `"${text.replace(/"/g, "\"\"")}"`;
	return text;
}).join(",");
const createCsvBody = (entries) => {
	const rows = [CSV_HEADERS.join(",")];
	for (const entry of entries) rows.push(toCsvRow([
		entry.id,
		entry.turn,
		entry.actor,
		entry.action,
		entry.timestamp,
		entry.chipsDelta ?? "",
		entry.details ?? ""
	]));
	return rows.join("\n");
};
const respondMissingSession = (c) => respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
/**
* イベントログを CSV へ整形しレスポンスへ書き込む。
* @param c Hono コンテキスト。
* @param dependencies セッションストアなどの依存性。
*/
const handleLogsCsvExport = (c, dependencies) => {
	const sessionId = c.req.param("sessionId");
	const envelope = dependencies.store.getEnvelope(sessionId);
	if (!envelope) return respondMissingSession(c);
	const entryCount = envelope.eventLog.length;
	const csv = createCsvBody(envelope.eventLog);
	dependencies.monitoring?.logExport({
		sessionId,
		format: "csv",
		entryCount
	});
	c.header("content-type", "text/csv; charset=utf-8");
	c.header("content-disposition", `attachment; filename="session-${sessionId}-logs.csv"`);
	return c.body(csv, 200);
};
/**
* イベントログを JSON 形式で返す。
* @param c Hono コンテキスト。
* @param dependencies セッションストアなどの依存性。
*/
const handleLogsJsonExport = (c, dependencies) => {
	const sessionId = c.req.param("sessionId");
	const envelope = dependencies.store.getEnvelope(sessionId);
	if (!envelope) return respondMissingSession(c);
	const entryCount = envelope.eventLog.length;
	dependencies.monitoring?.logExport({
		sessionId,
		format: "json",
		entryCount
	});
	c.header("content-disposition", `attachment; filename="session-${sessionId}-logs.json"`);
	return c.json({
		session_id: sessionId,
		event_log: envelope.eventLog
	}, 200);
};

//#endregion
//#region src/routes/sessions/{sessionId}/logs/export.csv.get.ts
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createExportCsvRoute = (deps) => createRoute({
	method: "get",
	path: "/sessions/{sessionId}/logs/export.csv",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "イベントログを CSV 形式でエクスポートします。`Content-Disposition` を設定してダウンロードを促します。",
	request: { params: z.object({ sessionId: z.string().min(1).describe("対象となる `session_id`。") }) },
	responses: {
		200: { description: "CSV が生成されました。" },
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* ログの CSV エクスポート GET ルートを登録する。
* @param app ルートを登録する Hono インスタンス。
* @param dependencies セッションストアなどの依存性。
*/
const registerLogsExportCsvRoute = (app$1, dependencies) => {
	const route = createExportCsvRoute(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		return handleLogsCsvExport(c, deps);
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/logs/export.json.get.ts
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createExportJsonRoute = (deps) => createRoute({
	method: "get",
	path: "/sessions/{sessionId}/logs/export.json",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "イベントログを JSON 形式でエクスポートします。",
	request: { params: z.object({ sessionId: z.string().min(1).describe("対象となる `session_id`。") }) },
	responses: {
		200: { description: "JSON イベントログが返却されました。" },
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* ログの JSON エクスポート GET ルートを登録する。
* @param app ルート登録先の Hono インスタンス。
* @param dependencies セッションストアなどの依存性。
*/
const registerLogsExportJsonRoute = (app$1, dependencies) => {
	const route = createExportJsonRoute(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		return handleLogsJsonExport(c, deps);
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/results.get.ts
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createGetResultsRoute = (deps) => createRoute({
	method: "get",
	path: "/sessions/{sessionId}/results",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "ゲーム終了後の最終結果とイベントログを取得します。完了前は 409 を返します。",
	request: { params: z.object({ sessionId: z.string().min(1).describe("結果を取得する対象の `session_id`。") }) },
	responses: {
		200: {
			description: "セッションが完了しており、最終結果が取得できました。",
			content: { "application/json": { schema: sessionResultsResponseSchema } }
		},
		404: {
			description: "セッションが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		},
		409: {
			description: "セッションがまだ完了していないため結果を取得できません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
/**
* 完了済みセッションの最終結果 GET ルートを登録する。
* @param app OpenAPIHono インスタンス。
* @param dependencies セッションストアなどの依存性。
*/
const registerSessionResultsGetRoute = (app$1, dependencies) => {
	const route = createGetResultsRoute(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		const { sessionId } = c.req.valid("param");
		const envelope = deps.store.getEnvelope(sessionId);
		if (!envelope) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
		const finalResults = envelope.snapshot.finalResults;
		if (finalResults === null) return c.json(createErrorResponseBody({
			code: "RESULT_NOT_READY",
			message: "Session has not completed yet.",
			status: 409
		}), 409);
		return c.json({
			session_id: envelope.snapshot.sessionId,
			final_results: finalResults,
			event_log: envelope.eventLog
		}, 200);
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/state.get.ts
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createGetSessionStateRoute = (deps) => createRoute({
	method: "get",
	path: "/sessions/{sessionId}/state",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "セッションの最新スナップショットを取得し、ETag でクライアントのキャッシュバージョンと突き合わせます。",
	request: { params: z.object({ sessionId: z.string().min(1).describe("状態を取得する `session_id`。初期作成レスポンスで受け取った値を指定します。") }) },
	responses: {
		200: {
			description: "セッションが存在し、最新スナップショットとバージョンが返却されました。",
			content: { "application/json": { schema: sessionResponseSchema } }
		},
		304: { description: "送信された `If-None-Match` が最新バージョンと一致したため、キャッシュ済みデータを再利用できます。" },
		404: {
			description: "指定された `session_id` のデータが存在しません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const formatEtag = (version) => `"${version}"`;
const normalizeEtagToken = (token) => {
	const trimmed = token.trim();
	if (trimmed.length === 0) return "";
	if (trimmed === "*") return "*";
	const withoutWeakPrefix = trimmed.startsWith("W/") ? trimmed.slice(2) : trimmed;
	if (withoutWeakPrefix.startsWith("\"") && withoutWeakPrefix.endsWith("\"") && withoutWeakPrefix.length >= 2) return withoutWeakPrefix.slice(1, -1);
	return withoutWeakPrefix;
};
const parseIfNoneMatch = (headerValue) => {
	if (headerValue === null) return [];
	if (headerValue.trim().length === 0) return [];
	return headerValue.split(",").map((token) => normalizeEtagToken(token)).filter((token) => token.length > 0);
};
const isCachedVersionFresh = (ifNoneMatchHeader, version) => {
	const tokens = parseIfNoneMatch(ifNoneMatchHeader);
	if (tokens.length === 0) return false;
	if (tokens.includes("*")) return true;
	return tokens.includes(version);
};
/**
* セッション状態を返す GET ルートを登録する。
* @param app OpenAPIHono インスタンス。
* @param dependencies セッションストアなどの依存性。
*/
const registerSessionStateGetRoute = (app$1, dependencies) => {
	const route = createGetSessionStateRoute(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		const { sessionId } = c.req.valid("param");
		const envelope = deps.store.getEnvelope(sessionId);
		if (!envelope) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
		const etag = formatEtag(envelope.version);
		c.header("ETag", etag);
		if (isCachedVersionFresh(c.req.header("if-none-match") ?? null, envelope.version)) return c.body(null, 304);
		return c.json(toSessionResponse(envelope), 200);
	});
};

//#endregion
//#region src/routes/sessions/{sessionId}/stream.get.ts
const KEEP_ALIVE_INTERVAL_MS = 15e3;
/**
* 依存注入ミドルウェア付きのルート定義を生成する。
* @param deps セッションルートに必要な依存オブジェクト。
*/
const createSessionStreamRoute = (deps) => createRoute({
	method: "get",
	path: "/sessions/{sessionId}/stream",
	middleware: [createSessionDepsMiddleware(deps)],
	description: "指定したセッションの状態更新を SSE (Server-Sent Events) で購読します。`Last-Event-ID` を送ると未取得イベントを再送します。",
	request: { params: z.object({ sessionId: z.string().min(1).describe("SSE で監視する `session_id`。プレイヤー登録レスポンスで受け取った値を指定します。") }) },
	responses: {
		200: { description: "SSE ストリームが確立され、`state.delta` や `state.final` などのイベントが配信されます。" },
		404: {
			description: "セッションが見つかりません。",
			content: { "application/json": { schema: errorResponseSchema } }
		}
	}
});
const formatPayload = (event) => ({
	id: event.id,
	event: event.event,
	data: event.data
});
/**
* SSE ストリーム GET ルートを登録する。
* @param app OpenAPIHono インスタンス。
* @param dependencies セッションストアとゲートウェイ。
*/
const registerSessionStreamGetRoute = (app$1, dependencies) => {
	const route = createSessionStreamRoute(dependencies);
	app$1.openapi(route, (c) => {
		const deps = c.var.deps;
		const { sessionId } = c.req.valid("param");
		if (!deps.store.getEnvelope(sessionId)) return respondNotFound(c, "SESSION_NOT_FOUND", "Session does not exist.");
		const lastEventIdHeader = c.req.header("last-event-id");
		const logReplayAfterId = deps.eventLogService.isEventLogId(lastEventIdHeader ?? null) ? lastEventIdHeader ?? void 0 : void 0;
		let connection = null;
		let keepAliveHandle = null;
		const cleanup = () => {
			if (keepAliveHandle) {
				clearInterval(keepAliveHandle);
				keepAliveHandle = null;
			}
			if (connection) {
				connection.disconnect();
				connection = null;
			}
		};
		return streamSSE(c, async (stream) => {
			const send = (event) => {
				stream.writeSSE(formatPayload(event));
			};
			const connectOptions = {
				sessionId,
				send
			};
			if (typeof lastEventIdHeader === "string" && lastEventIdHeader.length > 0) connectOptions.lastEventId = lastEventIdHeader;
			connection = deps.sseGateway.connect(connectOptions);
			keepAliveHandle = setInterval(() => {
				stream.write(": keep-alive\n\n");
			}, KEEP_ALIVE_INTERVAL_MS);
			const replayInput = {
				sessionId,
				send: (entry) => stream.writeSSE({
					id: entry.id,
					event: "event.log",
					data: JSON.stringify(entry)
				})
			};
			if (logReplayAfterId !== void 0) replayInput.lastEventId = logReplayAfterId;
			await deps.eventLogService.replayEntries(replayInput);
			await new Promise((resolve) => {
				stream.onAbort(() => {
					cleanup();
					resolve();
				});
			});
		}, async (err, stream) => {
			cleanup();
			console.error(err);
			await stream.write(": error\n\n");
		});
	});
};

//#endregion
//#region src/services/eventLogService.ts
const isEventLogIdentifier = (value) => typeof value === "string" && value.startsWith("turn-");
const createEntryId = (store, sessionId, turn) => {
	return `turn-${turn}-log-${store.listEventLogAfter(sessionId).filter((entry) => entry.turn === turn).length + 1}`;
};
const appendEntries = (store, gateway, sessionId, entries) => {
	const saved = store.appendEventLog(sessionId, entries);
	for (const entry of saved) gateway.publishEventLog(sessionId, entry);
	return saved;
};
/**
* イベントログの永続化と SSE 配信を司るサービスを構築する。
* @param dependencies ストアと SSE ゲートウェイ。
*/
const createEventLogService = (dependencies) => {
	const recordAction = (input) => {
		const id = createEntryId(dependencies.store, input.sessionId, input.turn);
		const chipsDelta = input.chipsAfter - input.chipsBefore;
		const entry = {
			id,
			turn: input.turn,
			actor: input.actor,
			action: input.action,
			timestamp: input.timestamp,
			chipsDelta,
			details: {
				card: input.card,
				centralPotBefore: input.centralPotBefore,
				centralPotAfter: input.centralPotAfter,
				targetPlayer: input.targetPlayer ?? input.actor
			}
		};
		appendEntries(dependencies.store, dependencies.sseGateway, input.sessionId, [entry]);
		return entry;
	};
	const recordSystemEvent = (input) => {
		const entry = {
			id: createEntryId(dependencies.store, input.sessionId, input.turn),
			turn: input.turn,
			actor: input.actor,
			action: input.action,
			timestamp: input.timestamp,
			...input.details !== void 0 && { details: input.details },
			...input.chipsDelta !== void 0 && { chipsDelta: input.chipsDelta }
		};
		appendEntries(dependencies.store, dependencies.sseGateway, input.sessionId, [entry]);
		return entry;
	};
	const replayEntries = async ({ sessionId, lastEventId, send }) => {
		const entries = dependencies.store.listEventLogAfter(sessionId, lastEventId);
		for (const entry of entries) await send(entry);
	};
	return {
		recordAction,
		recordSystemEvent,
		replayEntries,
		isEventLogId: isEventLogIdentifier
	};
};

//#endregion
//#region src/services/monitoringService.ts
/**
* 構造化ログを出力するモニタリングサービスを構築する。
* @param dependencies ログ関数を含む依存性。
*/
const createMonitoringService = (dependencies) => {
	const logActionProcessing = (params) => {
		const entry = {
			level: params.result === "success" ? "info" : "warn",
			event: "action_processing",
			sessionId: params.sessionId,
			commandId: params.commandId,
			action: params.action,
			playerId: params.playerId,
			action_processing_ms: params.durationMs,
			result: params.result
		};
		if (params.version !== void 0) entry.version = params.version;
		if (params.errorCode !== void 0) entry.errorCode = params.errorCode;
		dependencies.log(entry);
	};
	const logMutexWait = (params) => {
		dependencies.log({
			level: "debug",
			event: "mutex_wait",
			sessionId: params.sessionId,
			mutex_wait_ms: params.waitMs
		});
	};
	const logSseConnectionChange = (params) => {
		dependencies.log({
			level: "info",
			event: "sse_connection_change",
			sessionId: params.sessionId,
			action: params.action,
			sse_connection_count: params.connectionCount
		});
	};
	const logTimerEvent = (params) => {
		const entry = {
			level: "info",
			event: "timer_event",
			sessionId: params.sessionId,
			action: params.action
		};
		if (params.deadline !== void 0) entry.deadline = params.deadline;
		if (params.turn !== void 0) entry.turn = params.turn;
		dependencies.log(entry);
	};
	const logSystemTimeout = (params) => {
		dependencies.log({
			level: "info",
			event: "system_timeout",
			sessionId: params.sessionId,
			turn: params.turn,
			forcedPlayerId: params.forcedPlayerId,
			cardTaken: params.cardTaken
		});
	};
	const logExport = (params) => {
		dependencies.log({
			level: "info",
			event: "export_success",
			sessionId: params.sessionId,
			format: params.format,
			entryCount: params.entryCount
		});
	};
	const logSessionEvent = (params) => {
		const entry = {
			level: "info",
			event: "session_event",
			sessionId: params.sessionId,
			action: params.action
		};
		if (params.playerCount !== void 0) entry.playerCount = params.playerCount;
		dependencies.log(entry);
	};
	return {
		logActionProcessing,
		logMutexWait,
		logSseConnectionChange,
		logTimerEvent,
		logSystemTimeout,
		logExport,
		logSessionEvent
	};
};

//#endregion
//#region src/services/ruleHintService.ts
const formatNoCardHint = (snapshot, timestamp) => {
	return {
		text: `公開カードはありません。新しいターン待機中です。山札は残り ${snapshot.deck.length} 枚です。`,
		emphasis: "info",
		turn: snapshot.turnState.turn,
		generatedAt: timestamp
	};
};
const formatForcedTakeHint = (snapshot, timestamp, card) => ({
	text: `チップを使い切った ${snapshot.turnState.currentPlayerId} はカード ${card} を必ず取得します。中央ポット ${snapshot.centralPot} 枚も一緒に受け取ります。`,
	emphasis: "warning",
	turn: snapshot.turnState.turn,
	generatedAt: timestamp
});
const describeActionableHint = (snapshot, timestamp, card) => {
	const centralPot = snapshot.centralPot;
	const effectiveValue = Math.max(card - centralPot, 0);
	const playerId = snapshot.turnState.currentPlayerId;
	const chips = snapshot.chips[playerId] ?? 0;
	const deckRemaining = snapshot.deck.length;
	const sentences = [`カード ${card} はポット ${centralPot} 枚で実質 ${effectiveValue} 点です。`];
	let emphasis = "info";
	if (chips <= 2) {
		sentences.push(`${playerId} の残りチップは ${chips} 枚です。支払うと選択肢が限られるため注意してください。`);
		emphasis = "warning";
	} else sentences.push(`${playerId} はチップ ${chips} 枚を保有しており、支払いと取得のどちらも選べます。`);
	if (deckRemaining <= 5) sentences.push(`山札は残り ${deckRemaining} 枚です。終盤の得点計画を意識しましょう。`);
	return {
		text: sentences.join(" "),
		emphasis,
		turn: snapshot.turnState.turn,
		generatedAt: timestamp
	};
};
const createHintFromSnapshot = (snapshot, timestamp) => {
	if (!snapshot.turnState.awaitingAction) return formatNoCardHint(snapshot, timestamp);
	const card = snapshot.turnState.cardInCenter;
	if (card === null) return formatNoCardHint(snapshot, timestamp);
	const currentPlayerId = snapshot.turnState.currentPlayerId;
	if ((snapshot.chips[currentPlayerId] ?? 0) === 0) return formatForcedTakeHint(snapshot, timestamp, card);
	return describeActionableHint(snapshot, timestamp, card);
};
/**
* ルールヘルプの生成とキャッシュ管理を担当するサービスを構築する。
* @param options 生成時刻を差し替えるためのオプション。
*/
const createRuleHintService = (options = {}) => {
	const now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
	const cache = /* @__PURE__ */ new Map();
	const refreshHint = (snapshot, version) => {
		const hint = createHintFromSnapshot(snapshot, now());
		const stored = {
			sessionId: snapshot.sessionId,
			stateVersion: version,
			hint
		};
		cache.set(snapshot.sessionId, stored);
		return stored;
	};
	const getLatestHint = (sessionId) => cache.get(sessionId) ?? null;
	return {
		refreshHint,
		getLatestHint
	};
};

//#endregion
//#region src/services/sseBroadcastGateway.ts
const MAX_EVENT_HISTORY = 100;
const cloneValue$1 = (value) => structuredClone(value);
const createStateDeltaEvent = (sessionId, snapshot, version) => ({
	id: `state:${version}`,
	event: "state.delta",
	data: JSON.stringify({
		session_id: sessionId,
		state_version: version,
		state: cloneValue$1(snapshot)
	})
});
const createStateFinalEvent = (sessionId, snapshot, version) => {
	if (snapshot.finalResults === null) return null;
	return {
		id: `state-final:${version}`,
		event: "state.final",
		data: JSON.stringify({
			session_id: sessionId,
			state_version: version,
			final_results: cloneValue$1(snapshot.finalResults)
		})
	};
};
const createSystemErrorEvent = (sessionId, payload) => ({
	id: `system-error:${Date.now().toString(16)}`,
	event: "system.error",
	data: JSON.stringify({
		session_id: sessionId,
		error: payload
	})
});
const createRuleHintEvent = (sessionId, payload) => ({
	id: `rule-hint:${payload.stateVersion}`,
	event: "rule.hint",
	data: JSON.stringify({
		session_id: sessionId,
		state_version: payload.stateVersion,
		hint: {
			text: payload.hint.text,
			emphasis: payload.hint.emphasis,
			turn: payload.hint.turn,
			generated_at: payload.hint.generatedAt
		}
	})
});
/**
* SSE 接続の登録とイベント履歴の管理を行うブロードキャストゲートウェイを構築する。
* @param dependencies モニタリングサービスなどのオプション依存性。
*/
const createSseBroadcastGateway = (dependencies = {}) => {
	const connections = /* @__PURE__ */ new Map();
	const history = /* @__PURE__ */ new Map();
	const getConnectionCount = (sessionId) => connections.get(sessionId)?.size ?? 0;
	const appendHistory = (sessionId, event) => {
		const events = history.get(sessionId) ?? [];
		events.push(event);
		if (events.length > MAX_EVENT_HISTORY) events.splice(0, events.length - MAX_EVENT_HISTORY);
		history.set(sessionId, events);
	};
	const broadcast = (sessionId, event, options = {}) => {
		if (options.remember ?? true) appendHistory(sessionId, event);
		const listeners = connections.get(sessionId);
		if (!listeners) return;
		for (const listener of listeners) listener.send(event);
	};
	const replayHistory = (sessionId, send, lastEventId) => {
		const events = history.get(sessionId);
		if (!events || events.length === 0) return;
		if (lastEventId === void 0) {
			for (const event of events) send(event);
			return;
		}
		const index = events.findIndex((event) => event.id === lastEventId);
		if (index === -1) {
			for (const event of events) send(event);
			return;
		}
		for (let offset = index + 1; offset < events.length; offset += 1) {
			const event = events[offset];
			if (!event) continue;
			send(event);
		}
	};
	const connect = (options) => {
		const listeners = connections.get(options.sessionId) ?? /* @__PURE__ */ new Set();
		const connection = {
			sessionId: options.sessionId,
			send: options.send
		};
		listeners.add(connection);
		connections.set(options.sessionId, listeners);
		const connectionCount = getConnectionCount(options.sessionId);
		dependencies.monitoring?.logSseConnectionChange({
			sessionId: options.sessionId,
			action: "connect",
			connectionCount
		});
		replayHistory(options.sessionId, options.send, options.lastEventId);
		const disconnect = () => {
			const current = connections.get(options.sessionId);
			if (!current) return;
			current.delete(connection);
			if (current.size === 0) connections.delete(options.sessionId);
			const newConnectionCount = getConnectionCount(options.sessionId);
			dependencies.monitoring?.logSseConnectionChange({
				sessionId: options.sessionId,
				action: "disconnect",
				connectionCount: newConnectionCount
			});
		};
		return { disconnect };
	};
	const publishStateDelta = (sessionId, snapshot, version) => {
		broadcast(sessionId, createStateDeltaEvent(sessionId, snapshot, version));
	};
	const publishStateFinal = (sessionId, snapshot, version) => {
		const event = createStateFinalEvent(sessionId, snapshot, version);
		if (!event) return;
		broadcast(sessionId, event);
	};
	const publishSystemError = (sessionId, payload) => {
		broadcast(sessionId, createSystemErrorEvent(sessionId, payload));
	};
	const publishEventLog = (sessionId, entry) => {
		broadcast(sessionId, {
			id: entry.id,
			event: "event.log",
			data: JSON.stringify(entry)
		}, { remember: false });
	};
	const publishRuleHint = (sessionId, payload) => {
		broadcast(sessionId, createRuleHintEvent(sessionId, payload));
	};
	return {
		connect,
		publishStateDelta,
		publishStateFinal,
		publishSystemError,
		publishEventLog,
		publishRuleHint
	};
};

//#endregion
//#region src/services/systemTimeoutHandler.ts
const defaultGenerateCommandId = (snapshot) => `system-timeout-${snapshot.turnState.turn}`;
/**
* タイムアウト発生時に system コマンドで強制取得させるハンドラを構築する。
* @param dependencies セッションストアとターンサービス。
*/
const createTimeoutCommandHandler = (dependencies) => {
	const generateCommandId = dependencies.generateCommandId ?? defaultGenerateCommandId;
	const handleTimeout = async (sessionId) => {
		const envelope = dependencies.store.getEnvelope(sessionId);
		if (envelope === void 0) return;
		const snapshot = envelope.snapshot;
		const turnState = snapshot.turnState;
		if (turnState.awaitingAction === false || turnState.cardInCenter === null) return;
		const turn = turnState.turn;
		const forcedPlayerId = turnState.currentPlayerId;
		const cardTaken = turnState.cardInCenter;
		try {
			const result = await dependencies.turnService.applyCommand({
				sessionId,
				commandId: generateCommandId(snapshot),
				expectedVersion: envelope.version,
				playerId: "system",
				action: "takeCard"
			});
			dependencies.monitoring?.logSystemTimeout({
				sessionId,
				turn,
				forcedPlayerId,
				cardTaken
			});
			const eventOptions = {};
			if (dependencies.sseGateway) eventOptions.sseGateway = dependencies.sseGateway;
			if (dependencies.ruleHintService) eventOptions.ruleHints = dependencies.ruleHintService;
			publishStateEvents(eventOptions, result.snapshot, result.version);
		} catch {}
	};
	return handleTimeout;
};

//#endregion
//#region src/services/chipLedger.ts
const ensurePlayerRegistered = (snapshot, playerId) => {
	const chips = snapshot.chips[playerId];
	if (typeof chips !== "number") throw createServiceError("PLAYER_NOT_FOUND", 404, `Player ${playerId} is not registered.`);
	return chips;
};
/**
* プレイヤーの所持チップに基づきアクション実行可否を検証する。
* @param snapshot チップ状況を保持しているゲームスナップショット
* @param playerId 判定対象のプレイヤーID
* @param action 検証するアクション種別
*/
const ensureChipActionAllowed = (snapshot, playerId, action) => {
	if (ensurePlayerRegistered(snapshot, playerId) > 0) return;
	if (action === "takeCard") return;
	throw createServiceError("CHIP_INSUFFICIENT", 422, "Player does not have enough chips.");
};
/**
* 現在のプレイヤーから 1 枚チップを徴収し中央ポットへ移す。
* @param snapshot チップ状況を保持しているゲームスナップショット
* @param playerId チップを支払うプレイヤーID
*/
const placeChipIntoCenter = (snapshot, playerId) => {
	const chips = ensurePlayerRegistered(snapshot, playerId);
	if (chips <= 0) throw createServiceError("CHIP_INSUFFICIENT", 422, "Player does not have enough chips.");
	const updated = chips - 1;
	snapshot.chips[playerId] = updated;
	snapshot.centralPot += 1;
	return {
		type: "chip.place",
		playerId,
		chipsDelta: -1,
		resultingChips: updated,
		centralPot: snapshot.centralPot
	};
};
/**
* 中央ポットにあるチップ全量をプレイヤーへ払い戻す。
* @param snapshot チップ状況を保持しているゲームスナップショット
* @param playerId 受け取るプレイヤーID
*/
const collectCentralPotForPlayer = (snapshot, playerId) => {
	const chips = ensurePlayerRegistered(snapshot, playerId);
	const pot = snapshot.centralPot;
	if (pot <= 0) return null;
	const updated = chips + pot;
	snapshot.chips[playerId] = updated;
	snapshot.centralPot = 0;
	return {
		type: "chip.collect",
		playerId,
		chipsDelta: pot,
		resultingChips: updated,
		centralPot: snapshot.centralPot
	};
};

//#endregion
//#region src/services/scoreService.ts
const createCardSets = (cards) => {
	const sorted = [...cards].toSorted((a, b) => a - b);
	const sets = [];
	for (const card of sorted) {
		const current = sets.at(-1);
		const lastValue = current?.at(-1);
		if (current && lastValue !== void 0 && card === lastValue + 1) current.push(card);
		else sets.push([card]);
	}
	if (sorted.length === 0) return [];
	return sets;
};
const createPlacement = (playerId, cards, chips) => {
	const sets = createCardSets(cards);
	return {
		playerId,
		score: sets.reduce((sum, set) => sum + (set[0] ?? 0), 0) - chips,
		chipsRemaining: chips,
		cards: [...cards].toSorted((a, b) => a - b),
		cardSets: sets
	};
};
const sortPlacements = (placements) => {
	const sorted = placements.map((placement) => ({
		...placement,
		rank: 0
	})).toSorted((a, b) => {
		if (a.score !== b.score) return a.score - b.score;
		if (a.chipsRemaining !== b.chipsRemaining) return b.chipsRemaining - a.chipsRemaining;
		return a.playerId.localeCompare(b.playerId);
	});
	let currentRank = 0;
	let lastScore;
	let lastChips;
	for (const placement of sorted) {
		if (lastScore === void 0 || lastChips === void 0 || placement.score !== lastScore || placement.chipsRemaining !== lastChips) {
			currentRank += 1;
			lastScore = placement.score;
			lastChips = placement.chipsRemaining;
		}
		placement.rank = currentRank;
	}
	return sorted;
};
const detectTieBreak = (placements) => {
	let tieGroup;
	for (const placement of placements) {
		const existingGroup = tieGroup && tieGroup.score === placement.score ? tieGroup : void 0;
		if (existingGroup) existingGroup.contenders.push(placement);
		else {
			const sameScore = placements.filter((candidate) => candidate.score === placement.score);
			if (sameScore.length > 1) {
				tieGroup = {
					score: placement.score,
					contenders: sameScore
				};
				break;
			}
		}
	}
	if (!tieGroup) return null;
	const maxChips = Math.max(...tieGroup.contenders.map((item) => item.chipsRemaining));
	const winners = tieGroup.contenders.filter((item) => item.chipsRemaining === maxChips).map((item) => item.playerId).toSorted((a, b) => a.localeCompare(b));
	return {
		reason: "chipCount",
		tiedScore: tieGroup.score,
		contenders: tieGroup.contenders.map((item) => item.playerId).toSorted((a, b) => a.localeCompare(b)),
		winner: winners.length === 1 ? winners[0] ?? null : null
	};
};
/**
* ゲームスナップショットから最終スコアサマリーを算出する。
* @param snapshot 対象のゲームスナップショット。
*/
const calculateScoreSummary = (snapshot) => {
	const sorted = sortPlacements(snapshot.players.map((player) => createPlacement(player.id, snapshot.hands[player.id] ?? [], snapshot.chips[player.id] ?? 0)));
	return {
		placements: sorted,
		tieBreak: detectTieBreak(sorted)
	};
};

//#endregion
//#region src/services/turnDecision.ts
const createError = createServiceError;
const cloneSnapshot = (snapshot) => structuredClone(snapshot);
const ensureSessionEnvelope = (store, sessionId) => {
	const envelope = store.getEnvelope(sessionId);
	if (!envelope) throw createError("SESSION_NOT_FOUND", 404, "Session does not exist.");
	return envelope;
};
const nextPlayerIndex = (totalPlayers, currentIndex) => totalPlayers === 0 ? 0 : (currentIndex + 1) % totalPlayers;
const rotateToNextPlayer = (snapshot) => {
	const total = snapshot.playerOrder.length;
	if (total === 0) throw createError("PLAYER_ORDER_INVALID", 422, "Player order is not initialized.");
	const nextIndex = nextPlayerIndex(total, snapshot.turnState.currentPlayerIndex);
	const nextPlayerId = snapshot.playerOrder[nextIndex];
	if (nextPlayerId === void 0) throw createError("PLAYER_ORDER_INVALID", 422, "Player order is not initialized.");
	snapshot.turnState.currentPlayerIndex = nextIndex;
	snapshot.turnState.currentPlayerId = nextPlayerId;
};
const findPlayerIndex = (snapshot, playerId) => {
	const index = snapshot.playerOrder.indexOf(playerId);
	if (index === -1) return 0;
	return index;
};
const sortHand = (cards) => cards.toSorted((a, b) => a - b);
const drawNextCard = (snapshot) => {
	if (snapshot.deck.length === 0) return;
	const [nextCard, ...rest] = snapshot.deck;
	snapshot.deck = rest;
	return nextCard;
};
const applyPlaceChip = (snapshot) => {
	const playerId = snapshot.turnState.currentPlayerId;
	placeChipIntoCenter(snapshot, playerId);
	rotateToNextPlayer(snapshot);
};
const applyTakeCard = (snapshot) => {
	const card = snapshot.turnState.cardInCenter;
	const playerId = snapshot.turnState.currentPlayerId;
	if (card === null) throw createError("TURN_NOT_AVAILABLE", 422, "No active card is available.");
	const hand = snapshot.hands[playerId] ?? [];
	snapshot.hands[playerId] = sortHand([...hand, card]);
	collectCentralPotForPlayer(snapshot, playerId);
	snapshot.turnState.cardInCenter = null;
	snapshot.turnState.awaitingAction = false;
	const nextCard = drawNextCard(snapshot);
	if (nextCard !== void 0) {
		snapshot.turnState.cardInCenter = nextCard;
		snapshot.turnState.turn += 1;
		snapshot.turnState.awaitingAction = true;
	}
	snapshot.turnState.currentPlayerId = playerId;
	snapshot.turnState.currentPlayerIndex = findPlayerIndex(snapshot, playerId);
};
const isGameCompleted = (snapshot) => snapshot.deck.length === 0 && snapshot.turnState.cardInCenter === null && snapshot.turnState.awaitingAction === false;
const ensureActionAllowed = (snapshot, input) => {
	if (snapshot.phase === "completed") throw createError("GAME_ALREADY_COMPLETED", 409, "Game session already completed.");
	if (!snapshot.turnState.awaitingAction) throw createError("TURN_NOT_AVAILABLE", 422, "There is no active card waiting for an action.");
	const currentPlayerId = snapshot.turnState.currentPlayerId;
	if (input.playerId === "system") return;
	if (currentPlayerId !== input.playerId) throw createError("TURN_NOT_AVAILABLE", 422, "Action is only allowed for the current player.");
	ensureChipActionAllowed(snapshot, input.playerId, input.action);
};
const applyAction = (snapshot, input) => {
	switch (input.action) {
		case "placeChip":
			applyPlaceChip(snapshot);
			return;
		case "takeCard":
			applyTakeCard(snapshot);
			return;
		default: {
			const unsupportedAction = input.action;
			throw createError("ACTION_NOT_SUPPORTED", 422, `Action ${unsupportedAction} is not supported.`);
		}
	}
};
const updateTurnDeadline = (snapshot, timestamp, timeoutMs) => {
	if (snapshot.turnState.awaitingAction) {
		snapshot.turnState.deadline = calculateTurnDeadline(timestamp, timeoutMs);
		return;
	}
	snapshot.turnState.deadline = null;
};
/**
* ターン進行コマンドを処理するサービスを構築する。
* @param dependencies ストアやクロックなどの依存性。
*/
const createTurnDecisionService = (dependencies) => {
	const applyCommand = async (input) => {
		const startTime = Date.now();
		const envelope = ensureSessionEnvelope(dependencies.store, input.sessionId);
		const mutexStartTime = Date.now();
		try {
			const result = await envelope.mutex.runExclusive(() => {
				const mutexWaitMs = Date.now() - mutexStartTime;
				dependencies.monitoring?.logMutexWait({
					sessionId: input.sessionId,
					waitMs: mutexWaitMs
				});
				const current = ensureSessionEnvelope(dependencies.store, input.sessionId);
				if (dependencies.store.hasProcessedCommand(input.sessionId, input.commandId)) return {
					snapshot: current.snapshot,
					version: current.version
				};
				if (input.expectedVersion !== current.version) throw createError("STATE_VERSION_MISMATCH", 409, "State version does not match the latest snapshot.");
				const snapshot = cloneSnapshot(current.snapshot);
				ensureActionAllowed(snapshot, input);
				const actingPlayerId = input.playerId === "system" ? snapshot.turnState.currentPlayerId : input.playerId;
				const actionTurn = snapshot.turnState.turn;
				const cardBeforeAction = snapshot.turnState.cardInCenter;
				const centralPotBeforeAction = snapshot.centralPot;
				const chipsBeforeAction = snapshot.chips[actingPlayerId] ?? snapshot.chips[input.playerId] ?? 0;
				applyAction(snapshot, input);
				const chipsAfterAction = snapshot.chips[actingPlayerId] ?? snapshot.chips[input.playerId] ?? 0;
				const centralPotAfterAction = snapshot.centralPot;
				if (snapshot.phase === "setup") snapshot.phase = "running";
				const timestamp = dependencies.now();
				snapshot.updatedAt = timestamp;
				updateTurnDeadline(snapshot, timestamp, dependencies.turnTimeoutMs);
				if (input.action === "placeChip" || input.action === "takeCard") dependencies.eventLogs.recordAction({
					sessionId: snapshot.sessionId,
					turn: actionTurn,
					actor: input.playerId,
					targetPlayer: actingPlayerId,
					action: input.action,
					card: cardBeforeAction,
					centralPotBefore: centralPotBeforeAction,
					centralPotAfter: centralPotAfterAction,
					chipsBefore: chipsBeforeAction,
					chipsAfter: chipsAfterAction,
					timestamp
				});
				let finalSummary = null;
				if (snapshot.finalResults === null && snapshot.phase !== "completed" && isGameCompleted(snapshot)) {
					snapshot.phase = "completed";
					finalSummary = calculateScoreSummary(snapshot);
					snapshot.finalResults = finalSummary;
					snapshot.turnState.deadline = null;
				}
				const saved = dependencies.store.saveSnapshot(snapshot);
				dependencies.store.markCommandProcessed(input.sessionId, input.commandId);
				const next = saved.snapshot.turnState;
				const nextDeadline = next.deadline;
				if (next.awaitingAction && nextDeadline !== null && nextDeadline !== void 0) dependencies.timerSupervisor.register(saved.snapshot.sessionId, nextDeadline);
				else dependencies.timerSupervisor.clear(saved.snapshot.sessionId);
				if (finalSummary !== null) dependencies.eventLogs.recordSystemEvent({
					sessionId: saved.snapshot.sessionId,
					turn: saved.snapshot.turnState.turn,
					actor: "system",
					action: "gameCompleted",
					timestamp,
					details: { finalResults: finalSummary }
				});
				return {
					snapshot: saved.snapshot,
					version: saved.version
				};
			});
			const durationMs = Date.now() - startTime;
			dependencies.monitoring?.logActionProcessing({
				sessionId: input.sessionId,
				commandId: input.commandId,
				action: input.action,
				playerId: input.playerId,
				durationMs,
				result: "success",
				version: result.version
			});
			return result;
		} catch (err) {
			const durationMs = Date.now() - startTime;
			const errorCode = err !== null && typeof err === "object" && "code" in err && typeof err.code === "string" ? err.code : "UNKNOWN_ERROR";
			dependencies.monitoring?.logActionProcessing({
				sessionId: input.sessionId,
				commandId: input.commandId,
				action: input.action,
				playerId: input.playerId,
				durationMs,
				result: "error",
				errorCode
			});
			throw err;
		}
	};
	return { applyCommand };
};

//#endregion
//#region src/states/inMemoryGameStore.ts
const cloneValue = (value) => structuredClone(value);
const createSnapshotVersion = (snapshot) => createHash("sha1").update(JSON.stringify(snapshot)).digest("hex");
const createMutex = () => {
	let tail = Promise.resolve();
	const runExclusive = async (task) => {
		const run = tail.then(() => task(), () => task());
		const release = () => {
			tail = Promise.resolve();
		};
		tail = run.then(release, release);
		return run;
	};
	return { runExclusive };
};
const ensureEnvelope = (sessions, sessionId) => {
	const envelope = sessions.get(sessionId);
	if (!envelope) throw new Error(`Session ${sessionId} is not initialized`);
	return envelope;
};
/**
* 現在のプロセス内でゲームのセッション情報をすべてメモリに保持するストア。
*/
const createInMemoryGameStore = () => {
	const sessions = /* @__PURE__ */ new Map();
	const saveSnapshot = (snapshot) => {
		const normalizedSnapshot = cloneValue(snapshot);
		const version = createSnapshotVersion(normalizedSnapshot);
		const existing = sessions.get(snapshot.sessionId);
		if (existing) {
			existing.snapshot = normalizedSnapshot;
			existing.version = version;
			return existing;
		}
		const created = {
			snapshot: normalizedSnapshot,
			version,
			eventLog: [],
			processedCommands: /* @__PURE__ */ new Set(),
			mutex: createMutex()
		};
		sessions.set(snapshot.sessionId, created);
		return created;
	};
	const getSnapshot = (sessionId) => {
		const envelope = sessions.get(sessionId);
		if (!envelope) return;
		return cloneValue(envelope.snapshot);
	};
	const getEnvelope = (sessionId) => sessions.get(sessionId);
	const appendEventLog = (sessionId, entries) => {
		const envelope = ensureEnvelope(sessions, sessionId);
		const normalized = entries.map((entry) => cloneValue(entry));
		for (const entry of normalized) envelope.eventLog.push(entry);
		return normalized;
	};
	const listEventLogAfter = (sessionId, afterId) => {
		const envelope = ensureEnvelope(sessions, sessionId);
		if (afterId === void 0) return envelope.eventLog.map((entry) => cloneValue(entry));
		const index = envelope.eventLog.findIndex((entry) => entry.id === afterId);
		if (index === -1) return envelope.eventLog.map((entry) => cloneValue(entry));
		return envelope.eventLog.slice(index + 1).map((entry) => cloneValue(entry));
	};
	const hasProcessedCommand = (sessionId, commandId) => {
		return ensureEnvelope(sessions, sessionId).processedCommands.has(commandId);
	};
	const markCommandProcessed = (sessionId, commandId) => {
		ensureEnvelope(sessions, sessionId).processedCommands.add(commandId);
	};
	const listSessions = () => [...sessions.entries()].map(([sessionId, envelope]) => ({
		sessionId,
		version: envelope.version,
		phase: envelope.snapshot.phase,
		updatedAt: envelope.snapshot.updatedAt
	}));
	return {
		saveSnapshot,
		getSnapshot,
		getEnvelope,
		appendEventLog,
		listEventLogAfter,
		hasProcessedCommand,
		markCommandProcessed,
		listSessions
	};
};

//#endregion
//#region src/app.ts
/**
* console.info で構造化ログを出力するデフォルトロガー。
* @param entry ログエントリ。
*/
const defaultLogger = (entry) => {
	console.info(JSON.stringify(entry));
};
const noopTimeoutHandler = () => void 0;
/**
* 共通ミドルウェアやドキュメント、ルートをまとめた API アプリケーションを構築する。
* @param options ストアやクロック、ID 生成器などを差し替えるためのオプション。
*/
const createApp = (options = {}) => {
	const app$1 = new OpenAPIHono();
	const store = options.store ?? createInMemoryGameStore();
	const now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
	const generateSessionId = options.generateSessionId ?? (() => randomUUID());
	const turnTimeoutMs = options.turnTimeoutMs ?? 45e3;
	const monitoring = options.monitoring ?? createMonitoringService({ log: defaultLogger });
	const sseGateway = options.sseGateway ?? createSseBroadcastGateway({ monitoring });
	const ruleHintService = options.ruleHintService ?? createRuleHintService({ now });
	const eventLogService = options.eventLogService ?? createEventLogService({
		store,
		sseGateway
	});
	let timeoutHandler = noopTimeoutHandler;
	const timerSupervisor = options.timerSupervisor ?? createTimerSupervisor({
		store,
		now: () => Date.now(),
		schedule: (handler, delay) => setTimeout(handler, delay),
		cancel: (handle) => clearTimeout(handle),
		onTimeout: (sessionId) => timeoutHandler(sessionId),
		monitoring
	});
	const sessionsApp = new OpenAPIHono();
	const turnService = createTurnDecisionService({
		store,
		now,
		timerSupervisor,
		turnTimeoutMs,
		eventLogs: eventLogService,
		monitoring
	});
	if (options.timerSupervisor === void 0) timeoutHandler = createTimeoutCommandHandler({
		store,
		turnService,
		sseGateway,
		ruleHintService,
		monitoring
	});
	const sessionDependencies = {
		store,
		now,
		generateSessionId,
		turnService,
		timerSupervisor,
		turnTimeoutMs,
		sseGateway,
		eventLogService,
		ruleHintService,
		monitoring
	};
	timerSupervisor.restore();
	registerSessionPostRoute(sessionsApp, sessionDependencies);
	registerSessionGetRoute(sessionsApp, sessionDependencies);
	registerSessionStateGetRoute(sessionsApp, sessionDependencies);
	registerSessionHintGetRoute(sessionsApp, sessionDependencies);
	registerSessionStreamGetRoute(sessionsApp, sessionDependencies);
	registerSessionActionsPostRoute(sessionsApp, sessionDependencies);
	registerSessionResultsGetRoute(sessionsApp, sessionDependencies);
	registerLogsExportCsvRoute(sessionsApp, sessionDependencies);
	registerLogsExportJsonRoute(sessionsApp, sessionDependencies);
	app$1.route("/", sessionsApp);
	app$1.doc("/doc", {
		openapi: "3.0.0",
		info: {
			version: "1.0.0",
			title: "API ドキュメント"
		}
	}).get("/scalar", Scalar({ url: "/doc" }));
	return app$1;
};

//#endregion
//#region src/index.ts
const app = createApp();
if (import.meta.main) serve({
	fetch: app.fetch,
	port: 3e3
}, (info) => {
	console.info(`Server is running on http://localhost:${info.port}`);
});
hc("http://localhost:3000");

//#endregion
export { createInMemoryGameStore, createSetupSnapshot };