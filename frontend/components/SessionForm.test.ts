import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SessionForm from './SessionForm.vue';

describe('SessionForm', () => {
  describe('初期表示', () => {
    it('プレイヤー人数選択ボタンが 2〜7 人分表示される', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // 2〜7の6つのボタンがあることを確認
      for (let i = 2; i <= 7; i++) {
        expect(wrapper.find(`[data-testid="player-count-${i}"]`).exists()).toBe(
          true,
        );
      }
    });

    it('デフォルトで3人が選択されている', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const button3 = wrapper.find('[data-testid="player-count-3"]');
      expect(button3.classes()).toContain('border-blue-600');
    });

    it('送信ボタンが表示される', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true);
    });
  });

  describe('プレイヤー人数選択', () => {
    it('人数ボタンをクリックすると選択状態が変わる', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const button5 = wrapper.find('[data-testid="player-count-5"]');
      await button5.trigger('click');

      // 5人ボタンが選択状態になる
      expect(button5.classes()).toContain('border-blue-600');

      // 3人ボタンは非選択状態になる
      const button3 = wrapper.find('[data-testid="player-count-3"]');
      expect(button3.classes()).not.toContain('border-blue-600');
    });
  });

  describe('送信イベント', () => {
    it('フォーム送信時に submit イベントを発火する', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // デフォルト（3人）のまま送信
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('submit')).toHaveLength(1);
      expect(wrapper.emitted('submit')?.[0]).toEqual([3]);
    });

    it('選択した人数で submit イベントを発火する', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // 5人を選択
      await wrapper.find('[data-testid="player-count-5"]').trigger('click');

      // フォーム送信
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('submit')?.[0]).toEqual([5]);
    });
  });

  describe('ローディング状態', () => {
    it('isSubmitting が true の場合は送信ボタンが無効', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: true },
      });

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('isSubmitting が true の場合はローディング表示', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: true },
      });

      expect(wrapper.text()).toContain('作成中');
    });
  });

  describe('タッチ操作対応', () => {
    it('送信ボタンは最小 44px の高さを持つ', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      // Tailwind のクラスで min-h-11 (44px) が適用されているか確認
      expect(submitButton.classes()).toContain('min-h-11');
    });

    it('人数選択ボタンは最小 44x44px のサイズを持つ', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const countButtons = wrapper.findAll('[data-testid^="player-count-"]');
      expect(
        countButtons.every(
          (btn) =>
            btn.classes().includes('min-h-11') &&
            btn.classes().includes('min-w-11'),
        ),
      ).toBe(true);
    });
  });
});
