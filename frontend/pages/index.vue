<script setup lang="ts">
import { fetcher } from '~/utils/fetcher';

/** API エラー情報 */
type ApiError = {
  /** エラーコード */
  code: string;
  /** HTTP ステータスコード */
  status: number;
};

/** プレイヤー入力情報 */
type PlayerInput = {
  /** プレイヤー ID */
  id: string;
  /** 表示名 */
  display_name: string;
};

/** ローディング状態 */
const isSubmitting = ref(false);

/** エラー状態 */
const apiError = ref<ApiError | null>(null);

/**
 * セッション作成処理
 * @param players プレイヤー入力情報
 */
const handleSubmit = async (players: PlayerInput[]): Promise<void> => {
  isSubmitting.value = true;
  apiError.value = null;

  try {
    const response = await fetcher.sessions.$post({
      json: {
        players: players.map((player) => ({
          id: player.id,
          display_name: player.display_name,
        })),
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
</script>

<template>
  <div class="bg-gray-100 lg:px-8 min-h-screen px-4 py-8 sm:px-6">
    <div class="max-w-md mx-auto">
      <!-- ヘッダー -->
      <div class="mb-8 text-center">
        <h1 class="font-bold text-3xl text-gray-900">No Thanks!</h1>
        <p class="mt-2 text-gray-600">新しいゲームを作成</p>
      </div>

      <!-- セッション作成フォーム -->
      <div class="bg-white p-6 rounded-xl shadow-md">
        <SessionForm
          :is-submitting="isSubmitting"
          @submit="(players) => handleSubmit(players)"
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
