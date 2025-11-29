<script setup lang="ts">
type Props = {
  /** 送信中状態 */
  isSubmitting: boolean;
};

defineProps<Props>();

const emit = defineEmits<{
  /** フォーム送信イベント */
  submit: [];
}>();

/** フォーム送信 */
const handleSubmit = (): void => {
  emit('submit');
};
</script>

<template>
  <form @submit.prevent="() => handleSubmit()">
    <!-- 送信ボタン -->
    <button
      class="bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 font-medium hover:bg-blue-700 min-h-11 px-6 py-2 rounded-lg text-sm text-white w-full"
      data-testid="submit-button"
      :disabled="isSubmitting"
      type="submit"
    >
      <span v-if="isSubmitting">作成中...</span>
      <span v-else>ルームを作成</span>
    </button>
  </form>
</template>
