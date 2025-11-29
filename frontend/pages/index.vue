<script setup lang="ts">
import { fetcher } from '~/utils/fetcher';

/** API エラー情報 */
type ApiError = {
  /** エラーコード */
  code: string;
  /** HTTP ステータスコード */
  status: number;
};

/** ルーム情報 */
type RoomInfo = {
  sessionId: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  createdAt: string;
};

/** ローディング状態 */
const isSubmitting = ref(false);

/** エラー状態 */
const apiError = ref<ApiError | null>(null);

/** ルーム一覧 */
const rooms = ref<RoomInfo[]>([]);

/**
 * ルーム一覧を取得
 */
const loadRooms = async (): Promise<void> => {
  try {
    const response = await fetcher.sessions.$get();

    if (response.ok) {
      const data = (await response.json()) as { sessions: RoomInfo[] };
      // waiting フェーズのルームのみ表示（新しい順）
      rooms.value = data.sessions
        .filter((r) => r.phase === 'waiting')
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
  } catch {
    // エラーは無視（一覧取得失敗してもルーム作成は可能）
  }
};

/**
 * セッション作成処理
 */
const handleSubmit = async (): Promise<void> => {
  isSubmitting.value = true;
  apiError.value = null;

  try {
    const response = await fetcher.sessions.$post({
      json: {
        max_players: 7, // 固定値
      },
    });

    if (response.ok) {
      const data = await response.json();
      await navigateTo(`/sessions/${data.session_id}`);
    } else {
      const errorData = await response.json();
      apiError.value = {
        code: 'error' in errorData ? errorData.error.code : 'UNKNOWN_ERROR',
        status: response.status,
      };
    }
  } catch {
    apiError.value = {
      code: 'NETWORK_ERROR',
      status: 0,
    };
  } finally {
    isSubmitting.value = false;
  }
};

/** エラーを閉じる */
const dismissError = (): void => {
  apiError.value = null;
};

/** 再試行 */
const retrySubmit = (): void => {
  apiError.value = null;
};

/**
 * ルームに参加
 * @param sessionId - 参加するセッションのID
 */
const joinRoom = (sessionId: string): void => {
  void navigateTo(`/sessions/${sessionId}`);
};

/** ポーリング間隔（ミリ秒） */
const POLLING_INTERVAL = 3000;

/** ポーリングタイマーID */
let pollingTimer: ReturnType<typeof setInterval> | null = null;

/**
 * ポーリング開始
 */
const startPolling = (): void => {
  // 初回読み込み
  void loadRooms();

  // 3秒毎にポーリング
  pollingTimer = setInterval(() => {
    void loadRooms();
  }, POLLING_INTERVAL);
};

/**
 * ポーリング停止
 */
const stopPolling = (): void => {
  if (pollingTimer !== null) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};

// マウント時にポーリング開始
onMounted(() => {
  startPolling();
});

// アンマウント時にポーリング停止
onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="bg-gray-100 lg:px-8 min-h-screen px-4 py-8 sm:px-6">
    <div class="max-w-md mx-auto">
      <!-- ヘッダー -->
      <div class="mb-8 text-center">
        <h1 class="font-bold text-3xl text-gray-900">Gift</h1>
      </div>

      <!-- ルーム一覧 -->
      <div class="bg-white p-6 rounded-xl shadow-md">
        <h2 class="font-bold mb-4 text-gray-800 text-lg">参加可能なルーム</h2>

        <!-- ルームがない場合 -->
        <div
          v-if="rooms.length === 0"
          class="py-4 text-center text-gray-500 text-sm"
          data-testid="no-rooms"
        >
          参加可能なルームがありません
        </div>

        <!-- ルーム一覧 -->
        <ul v-else class="space-y-3" data-testid="room-list">
          <li
            v-for="room in rooms"
            :key="room.sessionId"
            class="border border-gray-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg transition-colors"
          >
            <button
              class="flex items-center justify-between p-4 text-left w-full"
              :data-testid="`room-${room.sessionId}`"
              @click="() => joinRoom(room.sessionId)"
            >
              <div>
                <div class="font-medium text-gray-800 text-sm">
                  ルーム #{{ room.sessionId.slice(0, 8) }}
                </div>
                <div class="mt-1 text-gray-500 text-xs">
                  {{ room.playerCount }} / {{ room.maxPlayers }} 人が参加中
                </div>
              </div>
              <span class="text-blue-600 text-sm">参加 →</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- ルーム作成 -->
      <div class="bg-white mt-6 p-6 rounded-xl shadow-md">
        <SessionForm
          :is-submitting="isSubmitting"
          @submit="() => handleSubmit()"
        />
      </div>
    </div>

    <!-- エラー表示 -->
    <ErrorDisplay
      :error="apiError"
      @dismiss="() => dismissError()"
      @retry="() => retrySubmit()"
    />
  </div>
</template>
