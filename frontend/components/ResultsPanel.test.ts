import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ResultsPanel from './ResultsPanel.vue';

/**
 * スコア配置テストデータを作成する
 */
const createTestPlacement = (
  override: Partial<{
    rank: number;
    playerId: string;
    score: number;
    chipsRemaining: number;
    cards: number[];
    cardSets: number[][];
  }> = {},
) => ({
  rank: 1,
  playerId: 'player1',
  score: 15,
  chipsRemaining: 3,
  cards: [3, 4, 5, 10],
  cardSets: [[3, 4, 5], [10]],
  ...override,
});

/**
 * ゲーム結果テストデータを作成する
 */
const createTestResults = (
  override: Partial<{
    placements: ReturnType<typeof createTestPlacement>[];
    tieBreak: {
      reason: 'chipCount';
      tiedScore: number;
      contenders: string[];
      winner: string | null;
    } | null;
  }> = {},
) => ({
  placements: [
    createTestPlacement({ rank: 1, playerId: 'player1', score: 15 }),
    createTestPlacement({
      rank: 2,
      playerId: 'player2',
      score: 25,
      chipsRemaining: 2,
    }),
    createTestPlacement({
      rank: 3,
      playerId: 'player3',
      score: 35,
      chipsRemaining: 0,
    }),
  ],
  tieBreak: null,
  ...override,
});

describe('ResultsPanel', () => {
  describe('プレイヤー順位表示', () => {
    it('順位、プレイヤーID、スコアを表示する', () => {
      const results = createTestResults();
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // 各プレイヤーの情報が表示されていることを確認
      expect(wrapper.text()).toContain('1位');
      expect(wrapper.text()).toContain('player1');
      expect(wrapper.text()).toContain('15');

      expect(wrapper.text()).toContain('2位');
      expect(wrapper.text()).toContain('player2');
      expect(wrapper.text()).toContain('25');

      expect(wrapper.text()).toContain('3位');
      expect(wrapper.text()).toContain('player3');
      expect(wrapper.text()).toContain('35');
    });

    it('残りチップ数を表示する', () => {
      const results = createTestResults();
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // チップ数が表示されていることを確認
      expect(wrapper.text()).toContain('3枚');
      expect(wrapper.text()).toContain('2枚');
      expect(wrapper.text()).toContain('0枚');
    });

    it('獲得カードを表示する', () => {
      const results = createTestResults({
        placements: [
          createTestPlacement({
            rank: 1,
            playerId: 'player1',
            cards: [3, 4, 5, 10, 15],
            cardSets: [[3, 4, 5], [10], [15]],
          }),
        ],
        tieBreak: null,
      });
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // カードセットの表示を確認（連番はグループ化）
      expect(wrapper.text()).toContain('3-5');
      expect(wrapper.text()).toContain('10');
      expect(wrapper.text()).toContain('15');
    });
  });

  describe('勝者ハイライト', () => {
    it('1位のプレイヤーがハイライト表示される', () => {
      const results = createTestResults();
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // 1位のプレイヤー行を取得
      const winnerRow = wrapper.find('[data-testid="result-row-0"]');
      expect(winnerRow.exists()).toBe(true);
      expect(winnerRow.classes()).toContain('bg-amber-50');
    });

    it('2位以降のプレイヤーはハイライト表示されない', () => {
      const results = createTestResults();
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // 2位以降の行はハイライトされない
      const secondRow = wrapper.find('[data-testid="result-row-1"]');
      expect(secondRow.exists()).toBe(true);
      expect(secondRow.classes()).not.toContain('bg-amber-50');
    });
  });

  describe('タイブレーク情報', () => {
    it('タイブレークがある場合、その情報を表示する', () => {
      const results = createTestResults({
        tieBreak: {
          reason: 'chipCount',
          tiedScore: 20,
          contenders: ['player1', 'player2'],
          winner: 'player1',
        },
      });
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // タイブレーク情報の表示を確認
      expect(wrapper.text()).toContain('同点');
      expect(wrapper.text()).toContain('20');
      expect(wrapper.text()).toContain('player1');
      expect(wrapper.text()).toContain('player2');
    });

    it('タイブレークがない場合、タイブレーク情報を表示しない', () => {
      const results = createTestResults({ tieBreak: null });
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // タイブレーク情報がないことを確認
      expect(wrapper.find('[data-testid="tiebreak-info"]').exists()).toBe(
        false,
      );
    });

    it('タイブレークで勝者が決まらない場合（同点継続）を表示する', () => {
      const results = createTestResults({
        tieBreak: {
          reason: 'chipCount',
          tiedScore: 20,
          contenders: ['player1', 'player2'],
          winner: null,
        },
      });
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      // 同点継続の表示を確認
      expect(wrapper.text()).toContain('引き分け');
    });
  });

  describe('新しいゲームボタン', () => {
    it('新しいゲームを開始するボタンが表示される', () => {
      const results = createTestResults();
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      const newGameButton = wrapper.find('[data-testid="new-game-button"]');
      expect(newGameButton.exists()).toBe(true);
      expect(newGameButton.text()).toContain('新しいゲーム');
    });

    it('ボタンクリックで newGame イベントが発火する', async () => {
      const results = createTestResults();
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      const newGameButton = wrapper.find('[data-testid="new-game-button"]');
      await newGameButton.trigger('click');

      expect(wrapper.emitted('newGame')).toHaveLength(1);
    });
  });

  describe('タッチ操作対応', () => {
    it('新しいゲームボタンは最小 44px の高さを持つ', () => {
      const results = createTestResults();
      const wrapper = mount(ResultsPanel, {
        props: {
          results,
        },
      });

      const newGameButton = wrapper.find('[data-testid="new-game-button"]');
      // min-h-11 (44px) クラスが適用されていることを確認
      expect(newGameButton.classes()).toContain('min-h-11');
    });
  });
});
