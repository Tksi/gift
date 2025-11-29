import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HintPanel from './HintPanel.vue';

/** テスト用ヒントデータ */
const createTestHint = (
  override: Partial<{
    text: string;
    emphasis: 'info' | 'warning';
    turn: number;
    generated_at: string;
  }> = {},
) => ({
  text: 'このカードは連番になるので取得がお得です',
  emphasis: 'info' as const,
  turn: 5,
  generated_at: '2025-01-01T00:00:00.000Z',
  ...override,
});

describe('HintPanel', () => {
  describe('表示状態', () => {
    it('isVisible が true でヒントがある場合、ヒントテキストを表示する', () => {
      const hint = createTestHint();
      const wrapper = mount(HintPanel, {
        props: {
          hint,
          isVisible: true,
          isLoading: false,
        },
      });

      expect(wrapper.text()).toContain(hint.text);
    });

    it('isVisible が false の場合、ヒント本文を表示しない', () => {
      const hint = createTestHint();
      const wrapper = mount(HintPanel, {
        props: {
          hint,
          isVisible: false,
          isLoading: false,
        },
      });

      expect(wrapper.text()).not.toContain(hint.text);
    });

    it('hint が null の場合、ヒント本文を表示しない', () => {
      const wrapper = mount(HintPanel, {
        props: {
          hint: null,
          isVisible: true,
          isLoading: false,
        },
      });

      expect(wrapper.find('[data-testid="hint-text"]').exists()).toBe(false);
    });
  });

  describe('emphasis スタイル', () => {
    it('emphasis が "info" の場合、通常スタイルで表示する', () => {
      const hint = createTestHint({ emphasis: 'info' });
      const wrapper = mount(HintPanel, {
        props: {
          hint,
          isVisible: true,
          isLoading: false,
        },
      });

      const hintContainer = wrapper.find('[data-testid="hint-container"]');
      expect(hintContainer.exists()).toBe(true);
      expect(hintContainer.classes()).toContain('bg-blue-50');
    });

    it('emphasis が "warning" の場合、警告スタイルで強調表示する', () => {
      const hint = createTestHint({ emphasis: 'warning' });
      const wrapper = mount(HintPanel, {
        props: {
          hint,
          isVisible: true,
          isLoading: false,
        },
      });

      const hintContainer = wrapper.find('[data-testid="hint-container"]');
      expect(hintContainer.exists()).toBe(true);
      expect(hintContainer.classes()).toContain('bg-amber-50');
    });
  });

  describe('トグルボタン', () => {
    it('トグルボタンをクリックすると toggle イベントを発火する', async () => {
      const wrapper = mount(HintPanel, {
        props: {
          hint: createTestHint(),
          isVisible: true,
          isLoading: false,
        },
      });

      const toggleButton = wrapper.find('[data-testid="hint-toggle"]');
      expect(toggleButton.exists()).toBe(true);

      await toggleButton.trigger('click');

      expect(wrapper.emitted('toggle')).toHaveLength(1);
    });

    it('isVisible が true の場合、「ヒントを隠す」ラベルを表示する', () => {
      const wrapper = mount(HintPanel, {
        props: {
          hint: createTestHint(),
          isVisible: true,
          isLoading: false,
        },
      });

      expect(wrapper.text()).toContain('ヒントを隠す');
    });

    it('isVisible が false の場合、「ヒントを表示」ラベルを表示する', () => {
      const wrapper = mount(HintPanel, {
        props: {
          hint: createTestHint(),
          isVisible: false,
          isLoading: false,
        },
      });

      expect(wrapper.text()).toContain('ヒントを表示');
    });
  });

  describe('ローディング状態', () => {
    it('isLoading が true の場合、ローディングインジケーターを表示する', () => {
      const wrapper = mount(HintPanel, {
        props: {
          hint: null,
          isVisible: true,
          isLoading: true,
        },
      });

      expect(wrapper.find('[data-testid="hint-loading"]').exists()).toBe(true);
    });

    it('isLoading が false の場合、ローディングインジケーターを表示しない', () => {
      const wrapper = mount(HintPanel, {
        props: {
          hint: createTestHint(),
          isVisible: true,
          isLoading: false,
        },
      });

      expect(wrapper.find('[data-testid="hint-loading"]').exists()).toBe(false);
    });
  });
});
