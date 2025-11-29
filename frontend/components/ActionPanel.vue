<script setup lang="ts">
import { computed } from 'vue';

type Props = {
  /** 自分の手番かどうか */
  isMyTurn: boolean;
  /** 所持チップ数 */
  myChips: number;
  /** アクション送信中かどうか */
  isSubmitting: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  /** チップを置くアクション */
  placeChip: [];
  /** カードを取るアクション */
  takeCard: [];
}>();

/** 「チップを置く」ボタンが無効かどうか */
const isPlaceChipDisabled = computed((): boolean => {
  return !props.isMyTurn || props.myChips === 0 || props.isSubmitting;
});

/** 「カードを取る」ボタンが無効かどうか */
const isTakeCardDisabled = computed((): boolean => {
  return !props.isMyTurn || props.isSubmitting;
});

/** チップを置くアクションを発火 */
const handlePlaceChip = (): void => {
  if (!isPlaceChipDisabled.value) {
    emit('placeChip');
  }
};

/** カードを取るアクションを発火 */
const handleTakeCard = (): void => {
  if (!isTakeCardDisabled.value) {
    emit('takeCard');
  }
};
</script>

<template>
  <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
    <!-- ローディングインジケーター -->
    <div
      v-if="isSubmitting"
      class="flex items-center justify-center mb-3"
      data-testid="loading-indicator"
    >
      <svg
        class="animate-spin h-5 mr-2 text-blue-600 w-5"
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
      <span class="text-gray-600 text-sm">送信中...</span>
    </div>

    <!-- アクションボタン -->
    <div class="flex gap-3">
      <!-- チップを置くボタン -->
      <button
        class="bg-amber-500 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 flex-1 font-medium hover:bg-amber-600 min-h-11 px-4 py-3 rounded-lg text-sm text-white transition-colors"
        data-testid="place-chip-button"
        :disabled="isPlaceChipDisabled"
        type="button"
        @click="() => handlePlaceChip()"
      >
        <span class="flex gap-1.5 items-center justify-center">
          <svg
            class="size-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          チップを置く
        </span>
      </button>

      <!-- カードを取るボタン -->
      <button
        class="bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 flex-1 font-medium hover:bg-green-700 min-h-11 px-4 py-3 rounded-lg text-sm text-white transition-colors"
        data-testid="take-card-button"
        :disabled="isTakeCardDisabled"
        type="button"
        @click="() => handleTakeCard()"
      >
        <span class="flex gap-1.5 items-center justify-center">
          <svg
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect height="18" rx="2" width="14" x="5" y="3" />
          </svg>
          カードを取る
        </span>
      </button>
    </div>

    <!-- 手番外のメッセージ -->
    <div
      v-if="!isMyTurn"
      class="mt-3 text-center text-gray-500 text-sm"
      data-testid="not-your-turn-message"
    >
      他のプレイヤーの手番です
    </div>

    <!-- チップ不足の警告 -->
    <div
      v-if="isMyTurn && myChips === 0"
      class="bg-amber-50 border border-amber-200 mt-3 p-2 rounded text-amber-700 text-center text-sm"
      data-testid="no-chips-warning"
    >
      チップがないため、カードを取る必要があります
    </div>
  </div>
</template>
