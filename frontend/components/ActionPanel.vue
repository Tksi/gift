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
  <div
    class="bg-white border border-gray-200 border-t p-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] shadow-sm sm:border sm:shadow-none sm:shadow-sm"
  >
    <!-- アクションボタン -->
    <div class="flex gap-2">
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
  </div>
</template>
