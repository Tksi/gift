<script setup lang="ts">
import { computed } from 'vue';

/** ゲームフェーズ */
type GamePhase = 'completed' | 'running' | 'setup' | 'waiting';

type Props = {
  /** 中央のカード番号 (null = カードなし) */
  cardInCenter: number | null;
  /** 中央ポットのチップ数 */
  centralPot: number;
  /** ゲームフェーズ */
  phase: GamePhase;
};

const props = defineProps<Props>();

/** フェーズに応じたボーダーカラークラス */
const borderColorClass = computed((): string => {
  switch (props.phase) {
    case 'running': {
      return 'border-blue-200';
    }
    case 'setup':
    case 'waiting': {
      return 'border-gray-300';
    }
    case 'completed': {
      return 'border-green-200';
    }
    default: {
      return 'border-gray-200';
    }
  }
});
</script>

<template>
  <div
    class="bg-white border-2 flex gap-4 items-center justify-center p-4 rounded-xl shadow-md"
    :class="[borderColorClass]"
    data-testid="game-board"
  >
    <!-- 中央カード表示 -->
    <div class="flex flex-col items-center">
      <!-- カードがある場合 -->
      <div
        v-if="cardInCenter !== null"
        class="bg-gradient-to-br flex font-bold from-amber-100 h-20 items-center justify-center rounded-lg shadow-inner text-3xl text-amber-800 to-amber-50 w-14"
        data-testid="center-card"
      >
        {{ cardInCenter }}
      </div>
      <!-- カードがない場合（空の状態） -->
      <div
        v-else
        class="bg-gray-100 border-2 border-dashed border-gray-300 flex h-20 items-center justify-center rounded-lg text-gray-400 w-14"
        data-testid="empty-card"
      >
        <svg
          class="size-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 6h12v12H6z"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <!-- 中央ポット表示 -->
    <div
      class="flex flex-col gap-0.5 items-center text-gray-600"
      data-testid="central-pot"
    >
      <div class="flex gap-1 items-center">
        <svg
          class="size-4 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
        <span class="font-semibold text-lg">{{ centralPot }}</span>
      </div>
      <span class="text-gray-500 text-xs">チップ</span>
    </div>
  </div>
</template>
