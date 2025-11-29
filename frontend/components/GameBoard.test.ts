import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import GameBoard from './GameBoard.vue';

describe('GameBoard', () => {
  describe('カード表示', () => {
    it('中央カードがある場合、カード番号を大きく表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 15,
          centralPot: 5,
          deckCount: 20,
          phase: 'running',
        },
      });

      const cardDisplay = wrapper.find('[data-testid="center-card"]');
      expect(cardDisplay.exists()).toBe(true);
      expect(cardDisplay.text()).toBe('15');
    });

    it('中央カードがnullの場合、空の状態を表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: null,
          centralPot: 0,
          deckCount: 24,
          phase: 'running',
        },
      });

      const emptyCard = wrapper.find('[data-testid="empty-card"]');
      expect(emptyCard.exists()).toBe(true);
    });

    it('カードがnullの場合、カード番号は表示されない', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: null,
          centralPot: 0,
          deckCount: 24,
          phase: 'running',
        },
      });

      const cardDisplay = wrapper.find('[data-testid="center-card"]');
      expect(cardDisplay.exists()).toBe(false);
    });
  });

  describe('山札プログレス表示', () => {
    it('中央カードがある場合、山札残量の円形プログレスを表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 15,
          centralPot: 5,
          deckCount: 20,
          phase: 'running',
        },
      });

      const deckDisplay = wrapper.find('[data-testid="deck-count"]');
      expect(deckDisplay.exists()).toBe(true);
    });

    it('中央カードがない場合、山札プログレスは表示されない', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: null,
          centralPot: 0,
          deckCount: 24,
          phase: 'running',
        },
      });

      const deckDisplay = wrapper.find('[data-testid="deck-count"]');
      expect(deckDisplay.exists()).toBe(false);
    });

    it('山札が50%以上残っている場合は緑色で表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 15,
          centralPot: 5,
          deckCount: 20, // 20/24 = 83%
          phase: 'running',
        },
      });

      const progress = wrapper.find('[data-testid="deck-progress"]');
      expect(progress.classes()).toContain('text-emerald-500');
    });

    it('山札が25%〜50%の場合は黄色で表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 15,
          centralPot: 5,
          deckCount: 10, // 10/24 = 42%
          phase: 'running',
        },
      });

      const progress = wrapper.find('[data-testid="deck-progress"]');
      expect(progress.classes()).toContain('text-amber-500');
    });

    it('山札が25%以下の場合は赤色で表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 15,
          centralPot: 5,
          deckCount: 5, // 5/24 = 21%
          phase: 'running',
        },
      });

      const progress = wrapper.find('[data-testid="deck-progress"]');
      expect(progress.classes()).toContain('text-red-500');
    });
  });

  describe('中央ポット表示', () => {
    it('中央ポットのチップ数をカードの下に表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 20,
          centralPot: 8,
          deckCount: 15,
          phase: 'running',
        },
      });

      const potDisplay = wrapper.find('[data-testid="central-pot"]');
      expect(potDisplay.exists()).toBe(true);
      expect(potDisplay.text()).toContain('8');
    });

    it('ポットが0の場合でも表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 10,
          centralPot: 0,
          deckCount: 24,
          phase: 'running',
        },
      });

      const potDisplay = wrapper.find('[data-testid="central-pot"]');
      expect(potDisplay.exists()).toBe(true);
      expect(potDisplay.text()).toContain('0');
    });
  });

  describe('ゲームフェーズによるスタイル変更', () => {
    it('running フェーズでは通常スタイルで表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 15,
          centralPot: 5,
          deckCount: 20,
          phase: 'running',
        },
      });

      const board = wrapper.find('[data-testid="game-board"]');
      expect(board.classes()).toContain('border-blue-200');
    });

    it('setup フェーズでは準備中スタイルで表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: null,
          centralPot: 0,
          deckCount: 24,
          phase: 'setup',
        },
      });

      const board = wrapper.find('[data-testid="game-board"]');
      expect(board.classes()).toContain('border-gray-300');
    });

    it('completed フェーズでは完了スタイルで表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: null,
          centralPot: 0,
          deckCount: 0,
          phase: 'completed',
        },
      });

      const board = wrapper.find('[data-testid="game-board"]');
      expect(board.classes()).toContain('border-green-200');
    });
  });
});
