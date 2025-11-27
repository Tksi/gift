import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ErrorDisplay from './ErrorDisplay.vue';

describe('ErrorDisplay', () => {
  describe('エラーがnullの場合', () => {
    it('何も表示しない', () => {
      const wrapper = mount(ErrorDisplay, {
        props: { error: null },
      });

      expect(wrapper.html()).toBe('<!--v-if-->');
    });
  });

  describe('エラーがある場合', () => {
    it('日本語エラーメッセージを表示する', () => {
      const wrapper = mount(ErrorDisplay, {
        props: {
          error: { code: 'SESSION_NOT_FOUND', status: 404 },
        },
      });

      expect(wrapper.text()).toContain('セッションが見つかりません。');
    });

    it('未知のエラーコードはデフォルトメッセージを表示する', () => {
      const wrapper = mount(ErrorDisplay, {
        props: {
          error: { code: 'UNKNOWN_CODE', status: 500 },
        },
      });

      expect(wrapper.text()).toContain(
        'エラーが発生しました。再度お試しください。',
      );
    });

    it('閉じるボタンをクリックすると dismiss イベントを発火する', async () => {
      const wrapper = mount(ErrorDisplay, {
        props: {
          error: { code: 'SESSION_NOT_FOUND', status: 404 },
        },
      });

      await wrapper.find('[data-testid="dismiss-button"]').trigger('click');

      expect(wrapper.emitted('dismiss')).toHaveLength(1);
    });

    it('リトライボタンをクリックすると retry イベントを発火する', async () => {
      const wrapper = mount(ErrorDisplay, {
        props: {
          error: { code: 'NETWORK_ERROR', status: 0 },
        },
      });

      await wrapper.find('[data-testid="retry-button"]').trigger('click');

      expect(wrapper.emitted('retry')).toHaveLength(1);
    });
  });

  describe('404 エラーの場合', () => {
    it('ホームへの導線を表示する', () => {
      const wrapper = mount(ErrorDisplay, {
        props: {
          error: { code: 'SESSION_NOT_FOUND', status: 404 },
        },
      });

      expect(wrapper.find('[data-testid="home-link"]').exists()).toBe(true);
    });
  });

  describe('404 以外のエラーの場合', () => {
    it('ホームへの導線を表示しない', () => {
      const wrapper = mount(ErrorDisplay, {
        props: {
          error: { code: 'NETWORK_ERROR', status: 0 },
        },
      });

      expect(wrapper.find('[data-testid="home-link"]').exists()).toBe(false);
    });
  });

  describe('レスポンシブ対応', () => {
    it('トースト要素が存在する', () => {
      const wrapper = mount(ErrorDisplay, {
        props: {
          error: { code: 'SESSION_NOT_FOUND', status: 404 },
        },
      });

      expect(wrapper.find('[data-testid="error-toast"]').exists()).toBe(true);
    });
  });
});
