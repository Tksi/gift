<script setup lang="ts">
import { computed } from 'vue';

type ScorePlacement = {
  rank: number;
  playerId: string;
  score: number;
  chipsRemaining: number;
  cards: number[];
  cardSets: number[][];
};

type TieBreak = {
  reason: 'chipCount';
  tiedScore: number;
  contenders: string[];
  winner: string | null;
};

type GameResults = {
  placements: ScorePlacement[];
  tieBreak: TieBreak | null;
};

/** プレイヤーIDと表示名のマッピング */
type PlayerMap = Record<string, string>;

type Props = {
  /** 最終結果 */
  results: GameResults;
  /** プレイヤーIDから表示名へのマッピング */
  playerMap: PlayerMap;
  /** 再戦送信中フラグ */
  isRematchSubmitting?: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 再戦を開始 */
  rematch: [];
}>();

/**
 * プレイヤーIDを表示名に変換する
 * @param playerId - プレイヤーID
 * @returns 表示名（マッピングがない場合はIDをそのまま返す）
 */
const getDisplayName = (playerId: string): string => {
  return props.playerMap[playerId] ?? playerId;
};

/**
 * カードセットを表示用文字列に変換する
 * 連番は "3-5" 形式、単独は "10" 形式
 * @param cardSet - 連番でグループ化されたカード配列
 * @returns 表示用文字列
 */
const formatCardSet = (cardSet: number[]): string => {
  if (cardSet.length === 0) return '';
  if (cardSet.length === 1) return String(cardSet[0]);

  const first = cardSet[0];
  const last = cardSet.at(-1);

  if (first === undefined || last === undefined) return '';

  return `${first}-${last}`;
};

/**
 * 結果行が勝者（1位）かどうかを判定
 * @param index - 結果配列のインデックス
 * @returns 1位であれば true
 */
const isWinner = (index: number): boolean => {
  const placement = props.results.placements[index];

  return placement?.rank === 1;
};

/**
 * タイブレークで勝者が決まらなかったかを判定
 */
const isTieDraw = computed((): boolean => {
  return (
    props.results.tieBreak !== null && props.results.tieBreak.winner === null
  );
});

/** 再戦ボタンをクリック */
const handleRematch = (): void => {
  emit('rematch');
};
</script>

<template>
  <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
    <!-- タイトル -->
    <h2 class="font-bold mb-4 text-gray-900 text-xl">ゲーム結果</h2>

    <!-- 結果テーブル -->
    <div class="mb-4 overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="pb-2 pr-4 text-gray-600 text-left text-sm">順位</th>
            <th class="pb-2 pr-4 text-gray-600 text-left text-sm">
              プレイヤー
            </th>
            <th class="pb-2 pr-4 text-gray-600 text-right text-sm">スコア</th>
            <th class="pb-2 pr-4 text-gray-600 text-right text-sm">
              残りチップ
            </th>
            <th class="pb-2 text-gray-600 text-left text-sm">獲得カード</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(placement, index) in results.placements"
            :key="placement.playerId"
            class="border-b border-gray-100"
            :class="[isWinner(index) ? 'bg-amber-50' : '']"
            :data-testid="`result-row-${index}`"
          >
            <td class="pr-4 py-3">
              <span
                class="font-medium"
                :class="[isWinner(index) ? 'text-amber-600' : 'text-gray-700']"
              >
                {{ placement.rank }}位
              </span>
              <span
                v-if="isWinner(index)"
                aria-label="勝者"
                class="ml-1 text-amber-500"
              >
                🏆
              </span>
            </td>
            <td class="pr-4 py-3 text-gray-900">
              {{ getDisplayName(placement.playerId) }}
            </td>
            <td class="font-medium pr-4 py-3 text-gray-900 text-right">
              {{ placement.score }}
            </td>
            <td class="pr-4 py-3 text-gray-600 text-right">
              {{ placement.chipsRemaining }}枚
            </td>
            <td class="py-3">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="(cardSet, setIndex) in placement.cardSets"
                  :key="setIndex"
                  class="bg-blue-100 px-2 py-0.5 rounded text-blue-800 text-sm"
                >
                  {{ formatCardSet(cardSet) }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- タイブレーク情報 -->
    <div
      v-if="results.tieBreak"
      class="bg-gray-50 mb-4 p-3 rounded-lg"
      data-testid="tiebreak-info"
    >
      <h3 class="font-medium mb-1 text-gray-800 text-sm">同点タイブレーク</h3>
      <p class="text-gray-600 text-sm">
        スコア {{ results.tieBreak.tiedScore }} で同点:
        {{ results.tieBreak.contenders.map(getDisplayName).join(', ') }}
      </p>
      <p v-if="isTieDraw" class="font-medium mt-1 text-amber-600 text-sm">
        チップ数も同じのため引き分け
      </p>
      <p
        v-else-if="results.tieBreak.winner"
        class="font-medium mt-1 text-green-600 text-sm"
      >
        チップ数が多い {{ getDisplayName(results.tieBreak.winner) }} が勝利
      </p>
    </div>

    <!-- 再戦ボタン -->
    <button
      class="bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 font-medium hover:bg-blue-700 min-h-11 px-6 py-3 rounded-lg text-white transition-colors w-full"
      data-testid="rematch-button"
      :disabled="isRematchSubmitting"
      type="button"
      @click="() => handleRematch()"
    >
      <span v-if="isRematchSubmitting">再戦開始中...</span>
      <span v-else>再戦する</span>
    </button>
  </div>
</template>
