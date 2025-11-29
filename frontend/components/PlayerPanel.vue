<script setup lang="ts">
import { computed } from 'vue';

/** プレイヤー基本情報 */
type PlayerSummary = {
  id: string;
  displayName: string;
};

type Props = {
  /** プレイヤー情報 */
  player: PlayerSummary;
  /** 所持チップ数 */
  chips: number;
  /** 獲得済みカード */
  cards: number[];
  /** 現在の手番かどうか */
  isCurrentTurn: boolean;
  /** 自分自身かどうか */
  isSelf: boolean;
};

const props = defineProps<Props>();

/**
 * カードを連番でグループ化する
 * @example [3, 5, 6, 15, 16, 17] → [[3], [5, 6], [15, 16, 17]]
 */
const cardSets = computed((): number[][] => {
  if (props.cards.length === 0) {
    return [];
  }

  const sorted = [...props.cards].sort((a, b) => a - b);
  const sets: number[][] = [];
  let currentSet: number[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const previous = sorted[i - 1]!;

    if (current === previous + 1) {
      // 連番なので同じグループに追加
      currentSet.push(current);
    } else {
      // 連番でないので新しいグループを開始
      sets.push(currentSet);
      currentSet = [current];
    }
  }

  // 最後のグループを追加
  sets.push(currentSet);

  return sets;
});

/** パネルの背景色クラス */
const backgroundClass = computed((): string => {
  return props.isSelf ? 'bg-blue-50' : 'bg-white';
});

/** 手番ハイライトクラス */
const turnHighlightClass = computed((): string => {
  return props.isCurrentTurn ? 'ring-2 ring-blue-500' : '';
});
</script>

<template>
  <div
    class="border border-gray-200 p-3 rounded-lg shadow-sm"
    :class="[backgroundClass, turnHighlightClass]"
    data-testid="player-panel"
  >
    <!-- プレイヤー名・チップ・手番バッジ -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex gap-2 items-center">
        <span class="font-semibold text-gray-800">
          {{ player.displayName }}
        </span>
        <!-- チップ数（自分のみ表示） -->
        <div
          v-if="isSelf"
          class="flex gap-1 items-center text-gray-600"
          data-testid="player-chips"
        >
          <svg
            class="size-3.5 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span class="font-medium text-sm">{{ chips }}</span>
        </div>
      </div>
      <span
        v-if="isCurrentTurn"
        class="bg-blue-100 font-medium px-2 py-0.5 rounded text-blue-700 text-xs"
      >
        手番
      </span>
    </div>

    <!-- 獲得済みカード -->
    <div data-testid="player-cards">
      <!-- カードがある場合 -->
      <div v-if="cardSets.length > 0" class="flex flex-wrap gap-1">
        <div
          v-for="(set, index) in cardSets"
          :key="index"
          class="bg-amber-100 inline-flex px-1.5 py-0.5 rounded text-amber-800 text-xs"
          data-testid="card-set"
        >
          <span v-if="set.length === 1">{{ set[0] }}</span>
          <span v-else>{{ set[0] }}-{{ set[set.length - 1] }}</span>
        </div>
      </div>
      <!-- カードがない場合 -->
      <div v-else class="text-gray-400 text-xs" data-testid="no-cards">
        カードなし
      </div>
    </div>
  </div>
</template>
