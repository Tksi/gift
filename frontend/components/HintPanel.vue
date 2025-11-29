<script setup lang="ts">
import { computed } from 'vue';

type RuleHint = {
  text: string;
  emphasis: 'info' | 'warning';
  turn: number;
  generated_at: string;
};

/** プレイヤーIDと表示名のマッピング */
type PlayerMap = Record<string, string>;

type Props = {
  /** ヒント情報 */
  hint: RuleHint | null;
  /** 表示状態 */
  isVisible: boolean;
  /** ローディング状態 */
  isLoading: boolean;
  /** プレイヤーIDから表示名へのマッピング */
  playerMap?: PlayerMap;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 表示トグル */
  toggle: [];
}>();

/**
 * ヒントテキスト内のプレイヤーIDを表示名に変換する
 * @returns プレイヤー名が変換されたヒントテキスト
 */
const formattedHintText = computed((): string => {
  if (!props.hint) return '';

  if (!props.playerMap || Object.keys(props.playerMap).length === 0) {
    return props.hint.text;
  }

  // playerMap のキー（playerId）をテキスト内で検索し、表示名に置換する
  let text = props.hint.text;

  for (const [playerId, displayName] of Object.entries(props.playerMap)) {
    text = text.replaceAll(playerId, displayName);
  }

  return text;
});

/** トグルボタンのラベル */
const toggleLabel = computed((): string => {
  return props.isVisible ? 'ヒントを隠す' : 'ヒントを表示';
});

/** ヒントコンテナの背景色クラス */
const containerClass = computed((): string => {
  if (!props.hint) return '';

  return props.hint.emphasis === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
});

/** トグルボタンをクリック */
const handleToggle = (): void => {
  emit('toggle');
};
</script>

<template>
  <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
    <!-- トグルボタン -->
    <button
      class="flex font-medium gap-2 hover:text-blue-700 items-center text-blue-600 text-sm transition-colors"
      data-testid="hint-toggle"
      type="button"
      @click="() => handleToggle()"
    >
      <svg
        class="size-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ toggleLabel }}
    </button>

    <!-- ローディング状態 -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center mt-3"
      data-testid="hint-loading"
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
      <span class="text-gray-600 text-sm">ヒントを取得中...</span>
    </div>

    <!-- ヒント本文 -->
    <div
      v-if="isVisible && hint && !isLoading"
      class="mt-3 p-3 rounded-lg"
      :class="containerClass"
      data-testid="hint-container"
    >
      <p class="text-gray-700 text-sm" data-testid="hint-text">
        {{ formattedHintText }}
      </p>
    </div>
  </div>
</template>
