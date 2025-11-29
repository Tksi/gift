import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';

import SessionForm from './SessionForm.vue';

describe('SessionForm', () => {
  describe('初期表示', () => {
    it('送信ボタンが表示される', async () => {
      const wrapper = await mountSuspended(SessionForm, {
        props: { isSubmitting: false },
      });

      expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('ルームを作成');
    });
  });

  describe('送信イベント', () => {
    it('フォーム送信時に submit イベントを発火する', async () => {
      const wrapper = await mountSuspended(SessionForm, {
        props: { isSubmitting: false },
      });

      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('submit')).toHaveLength(1);
    });
  });

  describe('ローディング状態', () => {
    it('isSubmitting が true の場合は送信ボタンが無効', async () => {
      const wrapper = await mountSuspended(SessionForm, {
        props: { isSubmitting: true },
      });

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('isSubmitting が true の場合はローディング表示', async () => {
      const wrapper = await mountSuspended(SessionForm, {
        props: { isSubmitting: true },
      });

      expect(wrapper.text()).toContain('作成中');
    });
  });

  describe('タッチ操作対応', () => {
    it('送信ボタンは最小 44px の高さを持つ', async () => {
      const wrapper = await mountSuspended(SessionForm, {
        props: { isSubmitting: false },
      });

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      // Tailwind のクラスで min-h-11 (44px) が適用されているか確認
      expect(submitButton.classes()).toContain('min-h-11');
    });
  });
});
