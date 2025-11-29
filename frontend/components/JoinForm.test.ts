import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import JoinForm from './JoinForm.vue';

describe('JoinForm', () => {
  const defaultProps = {
    isSubmitting: false,
    currentPlayers: [{ id: 'player-1', displayName: 'プレイヤー1' }],
    maxPlayers: 3,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('初期状態', () => {
    it('プレイヤー名入力フィールドが表示される', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const input = wrapper.find('[data-testid="player-name-input"]');
      expect(input.exists()).toBe(true);
    });

    it('参加ボタンが表示される', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const button = wrapper.find('[data-testid="join-button"]');
      expect(button.exists()).toBe(true);
      expect(button.text()).toContain('参加');
    });

    it('現在の参加者一覧が表示される', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const playerList = wrapper.find('[data-testid="player-list"]');
      expect(playerList.exists()).toBe(true);
      expect(playerList.text()).toContain('プレイヤー1');
    });

    it('参加人数の状況が表示される', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const status = wrapper.find('[data-testid="player-count"]');
      expect(status.exists()).toBe(true);
      expect(status.text()).toContain('1 / 3');
    });

    it('localStorage に保存された名前が初期値として表示される', async () => {
      localStorage.setItem('noThanks_playerName', '保存済みの名前');
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });
      await nextTick();

      const input = wrapper.find<HTMLInputElement>(
        '[data-testid="player-name-input"]',
      );
      expect(input.element.value).toBe('保存済みの名前');
    });
  });

  describe('バリデーション', () => {
    it('プレイヤー名が空の場合、参加ボタンが無効', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const button = wrapper.find('[data-testid="join-button"]');
      expect(button.attributes('disabled')).toBeDefined();
    });

    it('プレイヤー名を入力すると参加ボタンが有効になる', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const input = wrapper.find('[data-testid="player-name-input"]');
      await input.setValue('新しいプレイヤー');

      const button = wrapper.find('[data-testid="join-button"]');
      expect(button.attributes('disabled')).toBeUndefined();
    });
  });

  describe('イベント', () => {
    it('フォーム送信時に join イベントを発火する', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const input = wrapper.find('[data-testid="player-name-input"]');
      await input.setValue('新しいプレイヤー');

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      const emitted = wrapper.emitted('join');
      expect(emitted).toHaveLength(1);
      expect(emitted?.[0]).toEqual(['新しいプレイヤー']);
    });

    it('フォーム送信時に名前を localStorage に保存する', async () => {
      const wrapper = await mountSuspended(JoinForm, { props: defaultProps });

      const input = wrapper.find('[data-testid="player-name-input"]');
      await input.setValue('テストプレイヤー');

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      expect(localStorage.getItem('noThanks_playerName')).toBe(
        'テストプレイヤー',
      );
    });
  });

  describe('送信中状態', () => {
    it('isSubmitting が true の場合、ボタンが無効になる', async () => {
      const wrapper = await mountSuspended(JoinForm, {
        props: { ...defaultProps, isSubmitting: true },
      });

      const button = wrapper.find('[data-testid="join-button"]');
      expect(button.attributes('disabled')).toBeDefined();
    });

    it('isSubmitting が true の場合、ローディング表示される', async () => {
      const wrapper = await mountSuspended(JoinForm, {
        props: { ...defaultProps, isSubmitting: true },
      });

      const loading = wrapper.find('[data-testid="loading-indicator"]');
      expect(loading.exists()).toBe(true);
    });
  });

  describe('満員状態', () => {
    it('満員の場合、入力と参加ボタンが無効になる', async () => {
      const wrapper = await mountSuspended(JoinForm, {
        props: {
          ...defaultProps,
          currentPlayers: [
            { id: 'player-1', displayName: 'プレイヤー1' },
            { id: 'player-2', displayName: 'プレイヤー2' },
            { id: 'player-3', displayName: 'プレイヤー3' },
          ],
          maxPlayers: 3,
        },
      });

      const input = wrapper.find('[data-testid="player-name-input"]');
      const button = wrapper.find('[data-testid="join-button"]');

      expect(input.attributes('disabled')).toBeDefined();
      expect(button.attributes('disabled')).toBeDefined();
    });

    it('満員の場合、満員メッセージが表示される', async () => {
      const wrapper = await mountSuspended(JoinForm, {
        props: {
          ...defaultProps,
          currentPlayers: [
            { id: 'player-1', displayName: 'プレイヤー1' },
            { id: 'player-2', displayName: 'プレイヤー2' },
            { id: 'player-3', displayName: 'プレイヤー3' },
          ],
          maxPlayers: 3,
        },
      });

      const message = wrapper.find('[data-testid="full-message"]');
      expect(message.exists()).toBe(true);
    });
  });
});
