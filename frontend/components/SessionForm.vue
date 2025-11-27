<script setup lang="ts">
import { ref } from 'vue';

type Props = {
  /** 送信中状態 */
  isSubmitting: boolean;
};

defineProps<Props>();

const emit = defineEmits<{
  /** フォーム送信イベント */
  submit: [maxPlayers: number];
}>();

/** 最小プレイヤー数 */
const MIN_PLAYERS = 2;
/** 最大プレイヤー数 */
const MAX_PLAYERS = 7;

/** 選択されたプレイヤー人数 */
const selectedPlayerCount = ref(3);

/** プレイヤー人数オプション */
const playerCountOptions = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
);

/** フォーム送信 */
const handleSubmit = (): void => {
  emit('submit', selectedPlayerCount.value);
};
</script>

<template>
  <form @submit.prevent="() => handleSubmit()">
    <!-- プレイヤー人数選択 -->
    <div class="space-y-4">
      <label class="block font-medium text-gray-700 text-sm" for="player-count">
        プレイヤー人数
      </label>
      <div class="flex flex-wrap gap-2" role="radiogroup">
        <button
          v-for="count in playerCountOptions"
          :key="count"
          :aria-checked="selectedPlayerCount === count"
          :aria-label="`${count}人`"
          class="border-2 font-medium min-h-11 min-w-11 px-4 py-2 rounded-lg text-sm transition-colors"
          :class="[
            selectedPlayerCount === count
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white hover:border-gray-400 text-gray-700',
          ]"
          :data-testid="`player-count-${count}`"
          role="radio"
          type="button"
          @click="() => (selectedPlayerCount = count)"
        >
          {{ count }}人
        </button>
      </div>
      <p class="text-gray-500 text-xs">
        ルームを作成し、URLを共有して参加者を募ります
      </p>
    </div>

    <!-- 送信ボタン -->
    <div class="mt-6">
      <button
        class="bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 font-medium hover:bg-blue-700 min-h-11 px-6 py-2 rounded-lg text-sm text-white w-full"
        data-testid="submit-button"
        :disabled="isSubmitting"
        type="submit"
      >
        <span v-if="isSubmitting">作成中...</span>
        <span v-else>ルームを作成</span>
      </button>
    </div>
  </form>
</template>
