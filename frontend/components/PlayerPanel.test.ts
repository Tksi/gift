import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PlayerPanel from './PlayerPanel.vue';

describe('PlayerPanel', () => {
  const defaultProps = {
    player: {
      id: 'player-1',
      displayName: 'テストプレイヤー',
    },
    chips: 10,
    cards: [3, 5, 6, 15, 16, 17],
    isCurrentTurn: false,
    isSelf: false,
  };

  describe('プレイヤー情報表示', () => {
    it('プレイヤー名を表示する', () => {
      const wrapper = mount(PlayerPanel, {
        props: defaultProps,
      });

      expect(wrapper.text()).toContain('テストプレイヤー');
    });

    it('所持チップ数を表示する', () => {
      const wrapper = mount(PlayerPanel, {
        props: { ...defaultProps, chips: 8 },
      });

      const chipsDisplay = wrapper.find('[data-testid="player-chips"]');
      expect(chipsDisplay.text()).toContain('8');
    });
  });

  describe('獲得済みカード表示', () => {
    it('獲得済みカードを表示する', () => {
      const wrapper = mount(PlayerPanel, {
        props: defaultProps,
      });

      const cardsDisplay = wrapper.find('[data-testid="player-cards"]');
      expect(cardsDisplay.exists()).toBe(true);
    });

    it('連番カードをグループ化して表示する', () => {
      // カード: 3, 5, 6, 15, 16, 17 → グループ: [3], [5,6], [15,16,17]
      const wrapper = mount(PlayerPanel, {
        props: defaultProps,
      });

      const cardSets = wrapper.findAll('[data-testid="card-set"]');
      expect(cardSets.length).toBe(3);
    });

    it('カードがない場合は空の状態を表示する', () => {
      const wrapper = mount(PlayerPanel, {
        props: { ...defaultProps, cards: [] },
      });

      const emptyState = wrapper.find('[data-testid="no-cards"]');
      expect(emptyState.exists()).toBe(true);
    });
  });

  describe('手番ハイライト', () => {
    it('現在の手番プレイヤーをハイライト表示する', () => {
      const wrapper = mount(PlayerPanel, {
        props: { ...defaultProps, isCurrentTurn: true },
      });

      const panel = wrapper.find('[data-testid="player-panel"]');
      expect(panel.classes()).toContain('ring-2');
      expect(panel.classes()).toContain('ring-blue-500');
    });

    it('手番でない場合はハイライトしない', () => {
      const wrapper = mount(PlayerPanel, {
        props: { ...defaultProps, isCurrentTurn: false },
      });

      const panel = wrapper.find('[data-testid="player-panel"]');
      expect(panel.classes()).not.toContain('ring-2');
    });
  });

  describe('自分自身のスタイル', () => {
    it('自分自身のパネルを識別可能なスタイルで表示する', () => {
      const wrapper = mount(PlayerPanel, {
        props: { ...defaultProps, isSelf: true },
      });

      const panel = wrapper.find('[data-testid="player-panel"]');
      expect(panel.classes()).toContain('bg-blue-50');
    });

    it('他プレイヤーは通常スタイルで表示する', () => {
      const wrapper = mount(PlayerPanel, {
        props: { ...defaultProps, isSelf: false },
      });

      const panel = wrapper.find('[data-testid="player-panel"]');
      expect(panel.classes()).toContain('bg-white');
    });
  });

  describe('手番と自分自身の組み合わせ', () => {
    it('自分自身かつ手番の場合、両方のスタイルが適用される', () => {
      const wrapper = mount(PlayerPanel, {
        props: { ...defaultProps, isCurrentTurn: true, isSelf: true },
      });

      const panel = wrapper.find('[data-testid="player-panel"]');
      expect(panel.classes()).toContain('bg-blue-50');
      expect(panel.classes()).toContain('ring-2');
    });
  });
});
