<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 参加イベント（表示名を送出） */
  join: [displayName: string];
}>();

/** localStorage のキー */
const STORAGE_KEY = 'noThanks_playerName';

type Player = {
  id: string;
  displayName: string;
};

type Props = {
  /** 送信中状態 */
  isSubmitting: boolean;
  /** 現在の参加者 */
  currentPlayers: Player[];
  /** 最大プレイヤー数 */
  maxPlayers: number;
};

/** プレイヤー名入力値 */
const playerName = ref('');

/** localStorage から名前を復元 */
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved !== null && saved !== '') {
    playerName.value = saved;
  }
});

/** 満員かどうか */
const isFull = computed(
  (): boolean => props.currentPlayers.length >= props.maxPlayers,
);

/** 参加ボタンが無効かどうか */
const isJoinDisabled = computed((): boolean => {
  return props.isSubmitting || playerName.value.trim() === '' || isFull.value;
});

/** フォーム送信 */
const handleSubmit = (): void => {
  if (!isJoinDisabled.value) {
    const trimmedName = playerName.value.trim();
    // localStorage に名前を保存
    localStorage.setItem(STORAGE_KEY, trimmedName);
    emit('join', trimmedName);
  }
};
</script>

<template>
  <div>
    <h2 class="font-bold mb-4 text-gray-900 text-xl">ゲームに参加</h2>

    <!-- 参加者状況 -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2 text-gray-600 text-sm">
        <span>参加者</span>
        <span data-testid="player-count">
          {{ currentPlayers.length }} / {{ maxPlayers }} 人
        </span>
      </div>

      <!-- 参加者リスト -->
      <div
        class="bg-gray-50 flex items-center min-h-[60px] p-3 rounded-lg"
        data-testid="player-list"
      >
        <div
          v-if="currentPlayers.length === 0"
          class="text-center text-gray-400 text-sm w-full"
        >
          まだ参加者がいません
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <span
            v-for="player in currentPlayers"
            :key="player.id"
            class="bg-blue-100 px-3 py-1 rounded-full text-blue-800 text-sm"
          >
            {{ player.displayName }}
          </span>
        </div>
      </div>
    </div>

    <!-- 満員メッセージ -->
    <div
      v-if="isFull"
      class="bg-amber-50 border border-amber-200 mb-4 p-3 rounded-lg text-amber-700 text-center text-sm"
      data-testid="full-message"
    >
      参加者が満員です。ゲーム開始をお待ちください。
    </div>

    <!-- 参加フォーム -->
    <form @submit.prevent="() => handleSubmit()">
      <div class="mb-4">
        <label
          class="block font-medium mb-2 text-gray-700 text-sm"
          for="player-name"
        >
          あなたの名前
        </label>
        <input
          id="player-name"
          v-model="playerName"
          class="border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 px-4 py-3 rounded-lg text-gray-900 w-full"
          data-testid="player-name-input"
          :disabled="isFull || isSubmitting"
          maxlength="20"
          placeholder="名前を入力してください"
          type="text"
        />
      </div>

      <button
        class="bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium hover:bg-blue-700 min-h-11 px-6 py-3 rounded-lg text-white transition-colors w-full"
        data-testid="join-button"
        :disabled="isJoinDisabled"
        type="submit"
      >
        <span v-if="isSubmitting" class="flex items-center justify-center">
          <svg
            class="animate-spin h-5 mr-2 text-white w-5"
            data-testid="loading-indicator"
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
          参加中...
        </span>
        <span v-else>参加する</span>
      </button>
    </form>
  </div>
</template>
