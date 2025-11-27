import { z } from "@hono/zod-openapi";
import * as hono_types0 from "hono/types";
import * as hono_utils_types0 from "hono/utils/types";
import * as hono_utils_http_status0 from "hono/utils/http-status";
import * as hono_hono_base0 from "hono/hono-base";

//#region src/services/errors.d.ts
type ErrorDetail = {
  code: string;
  message: string;
  reason_code: string;
  instruction: string;
};
//#endregion
//#region src/services/monitoringService.d.ts
type ActionProcessingParams = {
  sessionId: string;
  commandId: string;
  action: string;
  playerId: string;
  durationMs: number;
  result: 'error' | 'success';
  version?: string;
  errorCode?: string;
};
type MutexWaitParams = {
  sessionId: string;
  waitMs: number;
};
type SseConnectionChangeParams = {
  sessionId: string;
  action: 'connect' | 'disconnect';
  connectionCount: number;
};
type TimerEventParams = {
  sessionId: string;
  action: 'clear' | 'register';
  deadline?: string;
  turn?: number;
};
type SystemTimeoutParams = {
  sessionId: string;
  turn: number;
  forcedPlayerId: string;
  cardTaken: number;
};
type ExportParams = {
  sessionId: string;
  format: 'csv' | 'json';
  entryCount: number;
};
type SessionEventParams = {
  sessionId: string;
  action: string;
  playerCount?: number;
};
type MonitoringService = {
  logActionProcessing: (params: ActionProcessingParams) => void;
  logMutexWait: (params: MutexWaitParams) => void;
  logSseConnectionChange: (params: SseConnectionChangeParams) => void;
  logTimerEvent: (params: TimerEventParams) => void;
  logSystemTimeout: (params: SystemTimeoutParams) => void;
  logExport: (params: ExportParams) => void;
  logSessionEvent: (params: SessionEventParams) => void;
};
//#endregion
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
//#region src/services/ruleHintService.d.ts
type RuleHintEmphasis = 'info' | 'warning';
type RuleHint = {
  text: string;
  emphasis: RuleHintEmphasis;
  turn: number;
  generatedAt: string;
};
type StoredRuleHint = {
  sessionId: string;
  stateVersion: string;
  hint: RuleHint;
};
type RuleHintService = {
  refreshHint: (snapshot: GameSnapshot, version: string) => StoredRuleHint;
  getLatestHint: (sessionId: string) => StoredRuleHint | null;
};
//#endregion
//#region src/services/sseBroadcastGateway.d.ts
type SseEventPayload = {
  id: string;
  event: string;
  data: string;
};
type ConnectOptions = {
  sessionId: string;
  lastEventId?: string;
  send: (event: SseEventPayload) => void;
};
type SseBroadcastGateway = {
  connect: (options: ConnectOptions) => {
    disconnect: () => void;
  };
  publishStateDelta: (sessionId: string, snapshot: GameSnapshot, version: string) => void;
  publishStateFinal: (sessionId: string, snapshot: GameSnapshot, version: string) => void;
  publishSystemError: (sessionId: string, payload: ErrorDetail) => void;
  publishEventLog: (sessionId: string, entry: EventLogEntry) => void;
  publishRuleHint: (sessionId: string, payload: {
    stateVersion: string;
    hint: RuleHint;
  }) => void;
};
//#endregion
//#region src/services/eventLogService.d.ts
type RecordActionInput = {
  sessionId: string;
  turn: number;
  actor: string;
  targetPlayer?: string;
  action: string;
  card: number | null;
  centralPotBefore: number;
  centralPotAfter: number;
  chipsBefore: number;
  chipsAfter: number;
  timestamp: string;
};
type RecordSystemEventInput = {
  sessionId: string;
  turn: number;
  actor: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
  chipsDelta?: number;
};
type ReplayEntriesInput = {
  sessionId: string;
  lastEventId?: string;
  send: (entry: EventLogEntry) => Promise<void> | void;
};
type EventLogService = {
  recordAction: (input: RecordActionInput) => EventLogEntry;
  recordSystemEvent: (input: RecordSystemEventInput) => EventLogEntry;
  replayEntries: (input: ReplayEntriesInput) => Promise<void>;
  isEventLogId: (value: string | null) => boolean;
};
//#endregion
//#region src/services/timerSupervisor.d.ts
type TimerSupervisor = {
  register: (sessionId: string, deadlineIso: string | null | undefined) => void;
  clear: (sessionId: string) => void;
  restore: () => void;
};
//#endregion
//#region src/services/chipLedger.d.ts
type ChipLedgerAction = 'placeChip' | 'takeCard';
//#endregion
//#region src/services/turnDecision.d.ts
type TurnDecisionAction = ChipLedgerAction;
type TurnCommandInput = {
  sessionId: string;
  commandId: string;
  expectedVersion: string;
  playerId: string;
  action: TurnDecisionAction;
};
type TurnDecisionResult = {
  snapshot: GameSnapshot;
  version: string;
};
type TurnDecisionService = {
  applyCommand: (input: TurnCommandInput) => Promise<TurnDecisionResult>;
};
//#endregion
//#region src/routes/sessions/types.d.ts
type SessionRouteDependencies = {
  store: InMemoryGameStore;
  now: () => string;
  generateSessionId: () => string;
  turnService: TurnDecisionService;
  timerSupervisor: TimerSupervisor;
  turnTimeoutMs: number;
  sseGateway: SseBroadcastGateway;
  eventLogService: EventLogService;
  ruleHintService: RuleHintService;
  monitoring?: MonitoringService;
};
/**
 * 依存を c.var に注入するミドルウェアの環境型。
 */
type SessionEnv = {
  Variables: {
    deps: SessionRouteDependencies;
  };
};
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
declare const app: hono_hono_base0.HonoBase<SessionEnv, hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId/logs/export.json": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 200;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId/logs/export.csv": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 200;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId/results": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 409;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        final_results: {
          placements: {
            rank: number;
            playerId: string;
            score: number;
            chipsRemaining: number;
            cards: number[];
            cardSets: number[][];
          }[];
          tieBreak: {
            reason: "chipCount";
            tiedScore: number;
            contenders: string[];
            winner: string | null;
          } | null;
        };
        event_log: {
          id: string;
          turn: number;
          actor: string;
          action: string;
          timestamp: string;
          chipsDelta?: number | undefined;
          details?: {
            [x: string]: hono_utils_types0.JSONValue;
          } | undefined;
        }[];
      };
      outputFormat: "json";
      status: 200;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId/actions": {
    $post: {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 422;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
        };
        turn_context: {
          turn: number;
          current_player_id: string;
          card_in_center: number | null;
          awaiting_action: boolean;
          central_pot: number;
          chips: {
            [x: string]: number;
          };
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      } & {
        json: {
          command_id: string;
          state_version: string;
          player_id: string;
          action: "placeChip" | "takeCard";
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 409;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId/stream": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 200;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId/hint": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        generated_from_version: string;
        hint: {
          text: string;
          emphasis: "info" | "warning";
          turn: number;
          generated_at: string;
        };
      };
      outputFormat: "json";
      status: 200;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId/state": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {};
      outputFormat: string;
      status: 304;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions/:sessionId": {
    $get: {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
        };
      };
      outputFormat: "json";
      status: 200;
    } | {
      input: {
        param: {
          sessionId: string;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 404;
    };
  };
}, "/"> & hono_types0.MergeSchemaPath<{
  "/sessions": {
    $post: {
      input: {
        json: {
          players: {
            id: string;
            display_name: string;
          }[];
          seed?: string | undefined;
        };
      };
      output: {
        session_id: string;
        state_version: string;
        state: {
          sessionId: string;
          phase: "setup" | "running" | "completed";
          deck: number[];
          discardHidden: number[];
          playerOrder: string[];
          rngSeed: string;
          players: {
            id: string;
            displayName: string;
          }[];
          chips: {
            [x: string]: number;
          };
          hands: {
            [x: string]: number[];
          };
          centralPot: number;
          turnState: {
            turn: number;
            currentPlayerId: string;
            currentPlayerIndex: number;
            cardInCenter: number | null;
            awaitingAction: boolean;
            deadline?: string | null | undefined;
          };
          createdAt: string;
          updatedAt: string;
          finalResults: {
            placements: {
              rank: number;
              playerId: string;
              score: number;
              chipsRemaining: number;
              cards: number[];
              cardSets: number[][];
            }[];
            tieBreak: {
              reason: "chipCount";
              tiedScore: number;
              contenders: string[];
              winner: string | null;
            } | null;
          } | null;
        };
      };
      outputFormat: "json";
      status: 201;
    } | {
      input: {
        json: {
          players: {
            id: string;
            display_name: string;
          }[];
          seed?: string | undefined;
        };
      };
      output: {
        error: {
          code: string;
          message: string;
          reason_code: string;
          instruction: string;
        };
      };
      outputFormat: "json";
      status: 422;
    };
  };
}, "/"> & {
  "/doc": {
    $get: {
      input: {};
      output: {};
      outputFormat: "json";
      status: hono_utils_http_status0.StatusCode;
    };
  };
} & {
  "/scalar": {
    $get: {
      input: {};
      output: {};
      outputFormat: string;
      status: hono_utils_http_status0.StatusCode;
    };
  };
}, "/">;
type AppType = typeof app;
//#endregion
export { AppType, createInMemoryGameStore, createSetupSnapshot };