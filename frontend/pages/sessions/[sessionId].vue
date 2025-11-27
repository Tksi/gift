<script setup lang="ts">
const route = useRoute();

/** セッション ID */
const sessionId = computed((): string => {
  const params = route.params;

  if ('sessionId' in params && typeof params.sessionId === 'string') {
    return params.sessionId;
  }

  return '';
});
</script>

<template>
  <div class="bg-gray-100 lg:px-8 min-h-screen px-4 py-8 sm:px-6">
    <div class="max-w-4xl mx-auto">
      <div class="bg-white p-6 rounded-xl shadow-md">
        <h1 class="font-bold mb-4 text-2xl text-gray-900">ゲーム画面</h1>
        <p class="text-gray-600">セッション ID: {{ sessionId }}</p>
        <p class="mt-4 text-gray-500">
          ゲームボード、プレイヤーパネル、アクションパネルは後続タスクで実装予定
        </p>
      </div>
    </div>
  </div>
</template>
