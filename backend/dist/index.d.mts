import * as _hono_zod_openapi0 from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import * as hono0 from "hono";

//#region src/schema/game.d.ts
declare const gamePhaseSchema: z.ZodEnum<{
  setup: "setup";
  running: "running";
  completed: "completed";
}>;
declare const snapshotSchema: z.ZodObject<{
  sessionId: z.ZodString;
  phase: z.ZodEnum<{
    setup: "setup";
    running: "running";
    completed: "completed";
  }>;
  deck: z.ZodArray<z.ZodNumber>;
  discardHidden: z.ZodArray<z.ZodNumber>;
  playerOrder: z.ZodArray<z.ZodString>;
  rngSeed: z.ZodString;
  players: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
  }, z.core.$strip>>;
  chips: z.ZodRecord<z.ZodString, z.ZodNumber>;
  hands: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodNumber>>;
  centralPot: z.ZodNumber;
  turnState: z.ZodObject<{
    turn: z.ZodNumber;
    currentPlayerId: z.ZodString;
    currentPlayerIndex: z.ZodNumber;
    cardInCenter: z.ZodNullable<z.ZodNumber>;
    awaitingAction: z.ZodBoolean;
    deadline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  }, z.core.$strip>;
  createdAt: z.ZodString;
  updatedAt: z.ZodString;
  finalResults: z.ZodNullable<z.ZodObject<{
    placements: z.ZodArray<z.ZodObject<{
      rank: z.ZodNumber;
      playerId: z.ZodString;
      score: z.ZodNumber;
      chipsRemaining: z.ZodNumber;
      cards: z.ZodArray<z.ZodNumber>;
      cardSets: z.ZodArray<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strip>>;
    tieBreak: z.ZodNullable<z.ZodObject<{
      reason: z.ZodLiteral<"chipCount">;
      tiedScore: z.ZodNumber;
      contenders: z.ZodArray<z.ZodString>;
      winner: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
  }, z.core.$strip>>;
}, z.core.$strip>;
//#endregion
//#region src/states/inMemoryGameStore.d.ts
type TimerHandle = ReturnType<typeof setTimeout>;
type GamePhase = z.infer<typeof gamePhaseSchema>;
type GameSnapshot = z.infer<typeof snapshotSchema>;
type EventLogEntry = {
  id: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  chipsDelta?: number;
  details?: Record<string, unknown>;
};
type Mutex = {
  runExclusive: <T>(task: () => Promise<T> | T) => Promise<T>;
};
type SessionEnvelope = {
  version: string;
  snapshot: GameSnapshot;
  eventLog: EventLogEntry[];
  processedCommands: Set<string>;
  mutex: Mutex;
  deadlineHandle?: TimerHandle;
  deadlineAt?: number;
};
type SessionSummary = {
  sessionId: string;
  phase: GamePhase;
  version: string;
  updatedAt: string;
};
type InMemoryGameStore = {
  saveSnapshot: (snapshot: GameSnapshot) => SessionEnvelope;
  getSnapshot: (sessionId: string) => GameSnapshot | undefined;
  getEnvelope: (sessionId: string) => SessionEnvelope | undefined;
  appendEventLog: (sessionId: string, entries: readonly EventLogEntry[]) => EventLogEntry[];
  listEventLogAfter: (sessionId: string, afterId?: string) => EventLogEntry[];
  hasProcessedCommand: (sessionId: string, commandId: string) => boolean;
  markCommandProcessed: (sessionId: string, commandId: string) => void;
  listSessions: () => SessionSummary[];
};
/**
 * 現在のプロセス内でゲームのセッション情報をすべてメモリに保持するストア。
 */
declare const createInMemoryGameStore: () => InMemoryGameStore;
//#endregion
//#region src/states/setup.d.ts
type SetupOptions = {
  seed?: string;
};
type SetupSnapshot = {
  deck: number[];
  discardHidden: number[];
  playerOrder: string[];
  rngSeed: string;
};
/**
 * 初期デッキ順序や伏せ札、プレイヤー順のシャッフル結果を生成する。
 * @param playerIds プレイヤー ID の配列（2〜7名）。
 * @param options シードなどのオプション。
 */
declare const createSetupSnapshot: (playerIds: readonly string[], options?: SetupOptions) => SetupSnapshot;
//#endregion
//#region src/index.d.ts
declare const app: _hono_zod_openapi0.OpenAPIHono<hono0.Env, {}, "/">;
type AppType = typeof app;
//#endregion
export { AppType, createInMemoryGameStore, createSetupSnapshot };