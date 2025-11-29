<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ApiError } from '~/types/apiError';
import { type SseEvent, useSse } from '~/composables/useSse';
import { generateCommandId, sendAction } from '~/utils/actionSender';
import { type RuleHint, fetchHint } from '~/utils/hintFetcher';
import { type GameResults, fetchResults } from '~/utils/resultsFetcher';
import {
  type GameStateData,
  type StateSuccessData,
  fetchState,
} from '~/utils/stateFetcher';

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

/** セッション ID */
const sessionId = computed((): string => {
  const params = route.params;

  if ('sessionId' in params && typeof params.sessionId === 'string') {
    return params.sessionId;
  }

  return '';
});

/** 現在のプレイヤー ID（localStorage から取得、仮実装） */
const currentPlayerId = ref<string | null>(null);

/** ゲーム状態 */
const gameState = ref<GameStateData | null>(null);

/** 状態バージョン */
const stateVersion = ref<string>('');

/** ローディング状態 */
const isLoading = ref(true);

/** エラー情報 */
const error = ref<ApiError | null>(null);

/** アクション送信中フラグ */
const isActionSubmitting = ref(false);

/** ヒント情報 */
const hint = ref<RuleHint | null>(null);

/** ヒント表示フラグ */
const isHintVisible = ref(false);

/** ヒントローディング状態 */
const isHintLoading = ref(false);

/** 結果情報 */
const results = ref<GameResults | null>(null);

/**
 * SSE イベントハンドラ
 * @param event - SSE イベント
 */
const handleSseEvent = (event: SseEvent): void => {
  switch (event.event) {
    case 'state.delta': {
      const data = event.data as {
        session_id: string;
        state_version: string;
        state: StateSuccessData['state'];
      };
      gameState.value = data.state;
      stateVersion.value = data.state_version;

      // ヒント再取得（手番が回ったときなど）
      void loadHint();

      break;
    }
    case 'state.final': {
      const data = event.data as {
        session_id: string;
        state_version: string;
        final_results: GameResults;
      };
      results.value = data.final_results;

      // ゲーム状態のフェーズを更新
      if (gameState.value !== null) {
        gameState.value = { ...gameState.value, phase: 'completed' };
      }

      break;
    }
    case 'rule.hint': {
      const data = event.data as { hint: RuleHint };
      hint.value = data.hint;

      break;
    }
    // No default
  }
};

const handleSseError = (err: Error): void => {
  console.error('SSE error:', err);
};

const handleSseReconnect = (): void => {
  console.info('SSE reconnected');
};

const {
  connect: connectSse,
  disconnect: disconnectSse,
  connectionState,
} = useSse({
  apiBase: config.public.apiBase,
  onEvent: handleSseEvent,
  onError: handleSseError,
  onReconnect: handleSseReconnect,
});

/** 初期状態を取得 */
const loadInitialState = async (): Promise<void> => {
  if (sessionId.value === '') return;

  isLoading.value = true;
  error.value = null;

  const result = await fetchState(sessionId.value);

  if (result.success) {
    gameState.value = result.data.state;
    stateVersion.value = result.data.state_version;

    // localStorage からプレイヤー ID を取得（仮実装）
    const storedPlayerId = localStorage.getItem(`player_${sessionId.value}`);

    if (storedPlayerId !== null && storedPlayerId !== '') {
      currentPlayerId.value = storedPlayerId;
    } else if (result.data.state.players.length > 0) {
      // デモ用：最初のプレイヤーとして扱う
      currentPlayerId.value = result.data.state.players[0]?.id ?? null;
    }

    // SSE 接続を開始
    connectSse(sessionId.value);

    // ヒントを取得
    void loadHint();

    // 完了状態なら結果を取得
    if (result.data.state.phase === 'completed') {
      void loadResults();
    }
  } else {
    error.value = { code: result.code, status: result.status };
  }

  isLoading.value = false;
};

/** ヒントを取得 */
const loadHint = async (): Promise<void> => {
  if (sessionId.value === '') return;

  isHintLoading.value = true;
  const result = await fetchHint(sessionId.value);

  if (result.success) {
    hint.value = result.data.hint;
  }

  isHintLoading.value = false;
};

/** 結果を取得 */
const loadResults = async (): Promise<void> => {
  if (sessionId.value === '') return;

  const result = await fetchResults(sessionId.value);

  if (result.success) {
    results.value = result.data.final_results;
  }
};

/**
 * アクション送信
 * @param action - アクション種別
 */
const handleAction = async (
  action: 'placeChip' | 'takeCard',
): Promise<void> => {
  if (
    sessionId.value === '' ||
    currentPlayerId.value === null ||
    isActionSubmitting.value
  ) {
    return;
  }

  isActionSubmitting.value = true;
  error.value = null;

  const result = await sendAction({
    sessionId: sessionId.value,
    commandId: generateCommandId(),
    stateVersion: stateVersion.value,
    playerId: currentPlayerId.value,
    action,
  });

  if (result.success) {
    // 成功時は SSE で状態が更新されるので何もしない
    // ただしレスポンスでも状態を更新（楽観的更新の代わり）
    const data = result.data;
    gameState.value = data.state;
    stateVersion.value = data.state_version;
  } else if (result.isVersionConflict) {
    // バージョン競合時は最新状態を再取得（SSE で受信済みのはず）

    console.info('Version conflict, waiting for SSE update');
  } else {
    error.value = { code: result.code, status: result.status };
  }

  isActionSubmitting.value = false;
};

/** チップを置く */
const handlePlaceChip = () => {
  void handleAction('placeChip');
};

/** カードを取る */
const handleTakeCard = () => {
  void handleAction('takeCard');
};

/** ヒント表示トグル */
const handleHintToggle = () => {
  isHintVisible.value = !isHintVisible.value;
};

/** 新しいゲームを開始 */
const handleNewGame = () => {
  void router.push('/');
};

/** エラー非表示 */
const handleErrorDismiss = () => {
  error.value = null;
};

/** リトライ */
const handleRetry = () => {
  void loadInitialState();
};

/** ゲームフェーズ */
const gamePhase = computed(
  (): 'completed' | 'running' | 'setup' | 'waiting' =>
    gameState.value?.phase ?? 'setup',
);

/** 中央カード */
const cardInCenter = computed((): number | null => {
  return gameState.value?.turnState.cardInCenter ?? null;
});

/** 中央ポット */
const centralPot = computed((): number => gameState.value?.centralPot ?? 0);

/** 現在の手番プレイヤー ID */
const currentTurnPlayerId = computed((): string | null => {
  return gameState.value?.turnState.currentPlayerId ?? null;
});

/** 自分の手番かどうか */
const isMyTurn = computed(
  (): boolean => currentTurnPlayerId.value === currentPlayerId.value,
);

/** 自分の所持チップ数 */
const myChips = computed((): number => {
  if (gameState.value === null || currentPlayerId.value === null) return 0;

  return gameState.value.chips[currentPlayerId.value] ?? 0;
});

/** プレイヤー一覧（表示用） */
type PlayerDisplayData = {
  player: { id: string; displayName: string };
  chips: number;
  cards: number[];
  isCurrentTurn: boolean;
  isSelf: boolean;
};

const players = computed((): PlayerDisplayData[] => {
  const state = gameState.value;

  if (state === null) return [];

  return state.players.map((player) => ({
    player,
    chips: state.chips[player.id] ?? 0,
    cards: state.hands[player.id] ?? [],
    isCurrentTurn: currentTurnPlayerId.value === player.id,
    isSelf: currentPlayerId.value === player.id,
  }));
});

/** 完了状態かどうか */
const isCompleted = computed(
  (): boolean => gamePhase.value === 'completed' && results.value !== null,
);

// マウント時に初期状態を取得
onMounted(() => {
  void loadInitialState();
});

// アンマウント時に SSE 接続を切断
onUnmounted(() => {
  disconnectSse();
});

// セッション ID が変更されたら再接続
watch(sessionId, (newSessionId, oldSessionId) => {
  if (newSessionId !== oldSessionId && newSessionId !== '') {
    disconnectSse();
    void loadInitialState();
  }
});
</script>

<template>
  <div class="bg-gray-100 lg:px-8 min-h-screen px-4 py-8 sm:px-6">
    <div class="max-w-4xl mx-auto">
      <!-- 接続状態インジケーター -->
      <div
        class="flex gap-2 items-center justify-end mb-4 text-sm"
        data-testid="connection-indicator"
      >
        <span
          class="inline-block rounded-full size-2"
          :class="{
            'bg-green-500': connectionState === 'connected',
            'bg-yellow-500':
              connectionState === 'connecting' ||
              connectionState === 'reconnecting',
            'bg-red-500': connectionState === 'disconnected',
          }"
        />
        <span class="text-gray-600">
          {{
            connectionState === 'connected'
              ? '接続中'
              : connectionState === 'connecting'
                ? '接続中...'
                : connectionState === 'reconnecting'
                  ? '再接続中...'
                  : '未接続'
          }}
        </span>
      </div>

      <!-- ローディング状態 -->
      <div
        v-if="isLoading"
        class="bg-white flex items-center justify-center min-h-[400px] p-6 rounded-xl shadow-md"
        data-testid="loading-state"
      >
        <div class="flex flex-col gap-3 items-center text-gray-500">
          <svg
            class="animate-spin h-8 text-blue-600 w-8"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            />
          </svg>
          <span>ゲームを読み込み中...</span>
        </div>
      </div>

      <!-- ゲーム画面 -->
      <template v-else-if="gameState && !isCompleted">
        <!-- メインレイアウト: デスクトップでは横並び -->
        <div class="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <!-- 左側: 中央盤面 -->
          <div class="flex-shrink-0 lg:w-80">
            <GameBoard
              :card-in-center="cardInCenter"
              :central-pot="centralPot"
              :phase="gamePhase"
            />
          </div>

          <!-- 右側: プレイヤーパネル -->
          <div class="flex-1">
            <div
              class="gap-4 grid grid-cols-1 sm:grid-cols-2"
              data-testid="player-panels"
            >
              <PlayerPanel
                v-for="p in players"
                :key="p.player.id"
                :cards="p.cards"
                :chips="p.chips"
                :is-current-turn="p.isCurrentTurn"
                :is-self="p.isSelf"
                :player="p.player"
              />
            </div>
          </div>
        </div>

        <!-- アクションパネル -->
        <ActionPanel
          class="mt-6"
          :is-my-turn="isMyTurn"
          :is-submitting="isActionSubmitting"
          :my-chips="myChips"
          @place-chip="() => handlePlaceChip()"
          @take-card="() => handleTakeCard()"
        />

        <!-- ヒントパネル -->
        <HintPanel
          class="mt-6"
          :hint="hint"
          :is-loading="isHintLoading"
          :is-visible="isHintVisible"
          @toggle="() => handleHintToggle()"
        />
      </template>

      <!-- 結果画面 -->
      <ResultsPanel
        v-else-if="isCompleted && results"
        :results="results"
        @new-game="() => handleNewGame()"
      />
    </div>

    <!-- エラー表示 -->
    <ErrorDisplay
      :error="error"
      @dismiss="() => handleErrorDismiss()"
      @retry="() => handleRetry()"
    />
  </div>
</template>
