<script setup lang="ts">
import { computed, ref } from 'vue';

/** プレイヤー入力情報 */
export type PlayerInput = {
  /** プレイヤー ID */
  id: string;
  /** 表示名 */
  display_name: string;
};

type Props = {
  /** 送信中状態 */
  isSubmitting: boolean;
};

defineProps<Props>();

const emit = defineEmits<{
  /** フォーム送信イベント */
  submit: [players: PlayerInput[]];
}>();

/** 最小プレイヤー数 */
const MIN_PLAYERS = 2;
/** 最大プレイヤー数 */
const MAX_PLAYERS = 7;

/** プレイヤー入力リスト */
const players = ref<PlayerInput[]>([
  { id: '', display_name: '' },
  { id: '', display_name: '' },
]);

/** プレイヤー追加 */
const addPlayer = (): void => {
  if (players.value.length < MAX_PLAYERS) {
    players.value.push({ id: '', display_name: '' });
  }
};

/**
 * プレイヤー削除
 * @param index 削除するプレイヤーのインデックス
 */
const removePlayer = (index: number): void => {
  if (players.value.length > MIN_PLAYERS) {
    players.value.splice(index, 1);
  }
};

/** 追加ボタンの有効/無効 */
const canAddPlayer = computed(() => players.value.length < MAX_PLAYERS);

/** 削除ボタンの有効/無効 */
const canRemovePlayer = computed(() => players.value.length > MIN_PLAYERS);

/** ID 重複チェック */
const duplicateIds = computed((): Set<string> => {
  const ids = players.value.map((p) => p.id).filter((id) => id.trim() !== '');
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }

    seen.add(id);
  }

  return duplicates;
});

/** 重複エラーメッセージを表示するか */
const showDuplicateError = computed(() => duplicateIds.value.size > 0);

/** フォームが有効かどうか */
const isFormValid = computed((): boolean => {
  // すべてのフィールドが入力されているか
  const allFilled = players.value.every(
    (p) => p.id.trim() !== '' && p.display_name.trim() !== '',
  );

  // 重複がないか
  const noDuplicates = duplicateIds.value.size === 0;

  return allFilled && noDuplicates;
});

/** フォーム送信 */
const handleSubmit = (): void => {
  if (!isFormValid.value) {
    return;
  }

  emit('submit', players.value);
};
</script>

<template>
  <form @submit.prevent="() => handleSubmit()">
    <!-- プレイヤー入力フィールド -->
    <div class="space-y-4">
      <div
        v-for="(player, index) in players"
        :key="index"
        class="bg-gray-50 flex gap-3 items-center p-3 rounded-lg"
        data-testid="player-field"
      >
        <span class="font-medium shrink-0 text-gray-600 text-sm">
          P{{ index + 1 }}
        </span>

        <!-- プレイヤー ID 入力 -->
        <input
          v-model="player.id"
          class="border flex-1 min-w-0 px-3 py-2 rounded-md text-sm"
          :class="[
            duplicateIds.has(player.id) && player.id.trim() !== ''
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
          ]"
          data-testid="player-id-input"
          placeholder="ID"
          type="text"
        />

        <!-- プレイヤー表示名入力 -->
        <input
          v-model="player.display_name"
          class="border border-gray-300 flex-1 focus:border-blue-500 focus:ring-blue-500 min-w-0 px-3 py-2 rounded-md text-sm"
          data-testid="player-name-input"
          placeholder="表示名"
          type="text"
        />

        <!-- 削除ボタン -->
        <button
          aria-label="プレイヤーを削除"
          class="disabled:cursor-not-allowed disabled:opacity-50 hover:bg-red-100 hover:text-red-700 min-h-11 min-w-11 p-2 rounded-md text-gray-500"
          data-testid="remove-player-button"
          :disabled="!canRemovePlayer"
          type="button"
          @click="() => removePlayer(index)"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- エラーメッセージ -->
    <p
      v-if="showDuplicateError"
      class="mt-2 text-red-600 text-sm"
      data-testid="duplicate-error"
    >
      プレイヤーIDが重複しています
    </p>

    <!-- アクションボタン -->
    <div class="flex gap-3 items-center justify-between mt-6">
      <!-- プレイヤー追加ボタン -->
      <button
        class="bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 font-medium hover:bg-gray-200 min-h-11 px-4 py-2 rounded-lg text-gray-700 text-sm"
        data-testid="add-player-button"
        :disabled="!canAddPlayer"
        type="button"
        @click="() => addPlayer()"
      >
        + プレイヤー追加
      </button>

      <!-- 送信ボタン -->
      <button
        class="bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 font-medium hover:bg-blue-700 min-h-11 px-6 py-2 rounded-lg text-sm text-white"
        data-testid="submit-button"
        :disabled="!isFormValid || isSubmitting"
        type="submit"
      >
        <span v-if="isSubmitting">作成中...</span>
        <span v-else>ゲームを作成</span>
      </button>
    </div>
  </form>
</template>
