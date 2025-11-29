<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ApiError } from '~/types/apiError';
import { type SseEvent, useSse } from '~/composables/useSse';
import { generateCommandId, sendAction } from '~/utils/actionSender';
import { type RuleHint, fetchHint } from '~/utils/hintFetcher';
import { joinSession } from '~/utils/joinFetcher';
import { type GameResults, fetchResults } from '~/utils/resultsFetcher';
import { startGame } from '~/utils/startFetcher';
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

/** 参加送信中フラグ */
const isJoinSubmitting = ref(false);

/** ゲーム開始送信中フラグ */
const isStartSubmitting = ref(false);

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

    // localStorage からプレイヤー ID を取得
    const storedPlayerId = localStorage.getItem(`player_${sessionId.value}`);

    if (storedPlayerId !== null && storedPlayerId !== '') {
      // 保存されているプレイヤーIDが実際に参加者リストに存在するか確認
      const playerExists = result.data.state.players.some(
        (p) => p.id === storedPlayerId,
      );

      if (playerExists) {
        currentPlayerId.value = storedPlayerId;
      } else {
        // プレイヤーIDが無効な場合はクリア
        localStorage.removeItem(`player_${sessionId.value}`);
        currentPlayerId.value = null;
      }
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

/**
 * 参加ハンドラ
 * @param displayName - 表示名
 */
const handleJoin = async (displayName: string): Promise<void> => {
  if (sessionId.value === '' || isJoinSubmitting.value) return;

  isJoinSubmitting.value = true;
  error.value = null;

  const result = await joinSession(sessionId.value, displayName);

  if (result.success) {
    // 参加成功: プレイヤー ID を保存
    currentPlayerId.value = result.data.player.id;
    localStorage.setItem(`player_${sessionId.value}`, result.data.player.id);

    // 状態を更新
    gameState.value = result.data.state;
    stateVersion.value = result.data.state_version;
  } else {
    error.value = { code: result.code, status: result.status };
  }

  isJoinSubmitting.value = false;
};

/**
 * ゲーム開始ハンドラ
 */
const handleStartGame = async (): Promise<void> => {
  if (sessionId.value === '' || isStartSubmitting.value) return;

  isStartSubmitting.value = true;
  error.value = null;

  const result = await startGame(sessionId.value);

  if (result.success) {
    // 状態を更新
    gameState.value = result.data.state;
    stateVersion.value = result.data.state_version;
  } else {
    error.value = { code: result.code, status: result.status };
  }

  isStartSubmitting.value = false;
};

/** ゲームフェーズ */
const gamePhase = computed(
  (): 'completed' | 'running' | 'setup' | 'waiting' =>
    gameState.value?.phase ?? 'setup',
);

/** 待機フェーズかどうか */
const isWaitingPhase = computed((): boolean => gamePhase.value === 'waiting');

/** 自分が参加済みかどうか */
const hasJoined = computed((): boolean => {
  if (currentPlayerId.value === null || gameState.value === null) return false;

  return gameState.value.players.some((p) => p.id === currentPlayerId.value);
});

/** 現在の参加者一覧 */
const currentPlayers = computed((): { id: string; displayName: string }[] => {
  return gameState.value?.players ?? [];
});

/** 最大参加人数 */
const maxPlayers = computed((): number => gameState.value?.maxPlayers ?? 7);

/** ゲーム開始可能かどうか（2人以上参加している） */
const canStartGame = computed((): boolean => currentPlayers.value.length >= 2);

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

      <!-- 待機フェーズ: 参加フォームまたは待機画面 -->
      <div
        v-if="!isLoading && gameState && isWaitingPhase"
        class="bg-white max-w-md mx-auto p-6 rounded-xl shadow-md"
        data-testid="waiting-phase"
      >
        <!-- 未参加: 参加フォーム -->
        <JoinForm
          v-if="!hasJoined"
          :current-players="currentPlayers"
          :is-submitting="isJoinSubmitting"
          :max-players="maxPlayers"
          @join="(name: string) => handleJoin(name)"
        />

        <!-- 参加済み: 待機画面 -->
        <div v-else data-testid="waiting-room">
          <h2 class="font-bold mb-4 text-gray-800 text-lg">
            参加者を待っています...
          </h2>

          <!-- 参加者リスト -->
          <div class="border-gray-200 border-t mb-4 pt-4">
            <h3 class="font-medium mb-2 text-gray-700 text-sm">
              参加者 ({{ currentPlayers.length }}/{{ maxPlayers }})
            </h3>
            <ul class="space-y-1">
              <li
                v-for="player in currentPlayers"
                :key="player.id"
                class="text-gray-600 text-sm"
                :class="{
                  'font-bold text-blue-600': player.id === currentPlayerId,
                }"
              >
                {{ player.displayName }}
                <span v-if="player.id === currentPlayerId">(あなた)</span>
              </li>
            </ul>
          </div>

          <!-- URL 共有案内 -->
          <p class="bg-gray-50 mb-4 p-3 rounded-lg text-gray-600 text-sm">
            URLを共有して参加者を招待してください
          </p>

          <!-- ゲーム開始ボタン -->
          <button
            class="bg-green-600 disabled:cursor-not-allowed disabled:opacity-50 font-medium hover:bg-green-700 min-h-11 mt-4 px-6 py-3 rounded-lg text-white transition-colors w-full"
            data-testid="start-game-button"
            :disabled="!canStartGame || isStartSubmitting"
            @click="() => handleStartGame()"
          >
            <span v-if="isStartSubmitting">開始中...</span>
            <span v-else-if="!canStartGame">2人以上で開始できます</span>
            <span v-else>ゲームを開始</span>
          </button>
        </div>
      </div>

      <!-- ゲーム画面 -->
      <template v-else-if="gameState && !isCompleted && !isWaitingPhase">
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
