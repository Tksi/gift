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
          phase: 'running',
        },
      });

      const cardDisplay = wrapper.find('[data-testid="center-card"]');
      expect(cardDisplay.exists()).toBe(false);
    });
  });

  describe('中央ポット表示', () => {
    it('中央ポットのチップ数をカードの下に表示する', () => {
      const wrapper = mount(GameBoard, {
        props: {
          cardInCenter: 20,
          centralPot: 8,
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
          phase: 'completed',
        },
      });

      const board = wrapper.find('[data-testid="game-board"]');
      expect(board.classes()).toContain('border-green-200');
    });
  });
});
