<script setup lang="ts">
import { computed } from 'vue';
import type { ApiError } from '~/types/apiError';
import { getErrorMessage } from '~/utils/errorMessages';

type Props = {
  /** エラー情報 (null の場合は非表示) */
  error: ApiError | null;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 閉じるイベント */
  dismiss: [];
  /** リトライイベント */
  retry: [];
}>();

/** 日本語エラーメッセージ */
const message = computed((): string => {
  if (!props.error) {
    return '';
  }

  return getErrorMessage(props.error.code);
});

/** 404 エラーかどうか */
const is404 = computed(() => props.error?.status === 404);
</script>

<template>
  <div
    v-if="error"
    class="bg-red-50 border border-red-200 bottom-4 fixed left-4 md:bottom-6 md:left-auto md:max-w-md md:right-6 p-4 right-4 rounded-lg shadow-lg z-50"
    data-testid="error-toast"
    role="alert"
  >
    <div class="flex gap-3 items-start">
      <!-- エラーアイコン -->
      <div class="shrink-0 text-red-500">
        <svg
          class="size-6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <!-- メッセージ部分 -->
      <div class="flex-1">
        <p class="font-medium text-red-800 text-sm">{{ message }}</p>

        <!-- 404 エラー時のホームへの導線 -->
        <NuxtLink
          v-if="is404"
          class="font-medium hover:text-red-800 inline-block mt-2 text-red-600 text-sm underline"
          data-testid="home-link"
          to="/"
        >
          ホームに戻る
        </NuxtLink>
      </div>

      <!-- 閉じるボタン -->
      <button
        aria-label="閉じる"
        class="hover:bg-red-100 hover:text-red-700 p-1 rounded shrink-0 text-red-500"
        data-testid="dismiss-button"
        type="button"
        @click="() => emit('dismiss')"
      >
        <svg
          class="size-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 18L18 6M6 6l12 12"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <!-- リトライボタン -->
    <div class="flex justify-end mt-3">
      <button
        class="bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 font-medium hover:bg-red-700 min-h-[44px] min-w-[44px] px-4 py-2 rounded-md text-sm text-white"
        data-testid="retry-button"
        type="button"
        @click="() => emit('retry')"
      >
        再試行
      </button>
    </div>
  </div>
</template>
