import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SessionForm from './SessionForm.vue';

describe('SessionForm', () => {
  describe('初期表示', () => {
    it('2人分の入力フィールドが表示される', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const playerFields = wrapper.findAll('[data-testid="player-field"]');
      expect(playerFields).toHaveLength(2);
    });

    it('送信ボタンが表示される', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true);
    });
  });

  describe('プレイヤー追加/削除', () => {
    it('プレイヤー追加ボタンでフィールドが増える', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      await wrapper.find('[data-testid="add-player-button"]').trigger('click');

      const playerFields = wrapper.findAll('[data-testid="player-field"]');
      expect(playerFields).toHaveLength(3);
    });

    it('プレイヤー削除ボタンでフィールドが減る', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // まず3人に増やす
      await wrapper.find('[data-testid="add-player-button"]').trigger('click');

      // 削除ボタンをクリック (最初のプレイヤーを削除)
      await wrapper
        .findAll('[data-testid="remove-player-button"]')[0]
        ?.trigger('click');

      const playerFields = wrapper.findAll('[data-testid="player-field"]');
      expect(playerFields).toHaveLength(2);
    });

    it('7人を超えて追加できない', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // 5人追加して7人に
      for (let i = 0; i < 5; i++) {
        await wrapper
          .find('[data-testid="add-player-button"]')
          .trigger('click');
      }

      const addButton = wrapper.find('[data-testid="add-player-button"]');
      expect(addButton.attributes('disabled')).toBeDefined();
    });

    it('2人未満に削除できない', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // 2人のときは削除ボタンが無効
      const removeButtons = wrapper.findAll(
        '[data-testid="remove-player-button"]',
      );
      expect(
        removeButtons.every((btn) => btn.attributes('disabled') !== undefined),
      ).toBe(true);
    });
  });

  describe('バリデーション', () => {
    it('プレイヤーIDが重複している場合はエラーを表示する', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const inputs = wrapper.findAll('[data-testid="player-id-input"]');

      // 両方に同じIDを入力
      await inputs[0]?.setValue('player1');
      await inputs[1]?.setValue('player1');

      expect(wrapper.text()).toContain('プレイヤーIDが重複しています');
    });

    it('空のIDではエラーを表示しない', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // 初期状態（空のID）ではエラー非表示
      expect(wrapper.text()).not.toContain('プレイヤーIDが重複しています');
    });

    it('すべてのフィールドが入力されていない場合は送信ボタンが無効', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // IDのみ入力、表示名未入力
      const idInputs = wrapper.findAll('[data-testid="player-id-input"]');
      await idInputs[0]?.setValue('player1');
      await idInputs[1]?.setValue('player2');

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('IDと表示名が重複なしで入力されている場合は送信ボタンが有効', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const idInputs = wrapper.findAll('[data-testid="player-id-input"]');
      const nameInputs = wrapper.findAll('[data-testid="player-name-input"]');

      await idInputs[0]?.setValue('player1');
      await nameInputs[0]?.setValue('プレイヤー1');
      await idInputs[1]?.setValue('player2');
      await nameInputs[1]?.setValue('プレイヤー2');

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.attributes('disabled')).toBeUndefined();
    });
  });

  describe('送信イベント', () => {
    it('フォーム送信時に submit イベントを発火する', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const idInputs = wrapper.findAll('[data-testid="player-id-input"]');
      const nameInputs = wrapper.findAll('[data-testid="player-name-input"]');

      await idInputs[0]?.setValue('player1');
      await nameInputs[0]?.setValue('プレイヤー1');
      await idInputs[1]?.setValue('player2');
      await nameInputs[1]?.setValue('プレイヤー2');

      // フォームのsubmitイベントをトリガー
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('submit')).toHaveLength(1);
      expect(wrapper.emitted('submit')?.[0]).toEqual([
        [
          { id: 'player1', display_name: 'プレイヤー1' },
          { id: 'player2', display_name: 'プレイヤー2' },
        ],
      ]);
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
    it('送信ボタンは最小 44x44px のサイズを持つ', () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      // Tailwind のクラスで min-h-11 (44px) が適用されているか確認
      expect(submitButton.classes()).toContain('min-h-11');
    });

    it('追加/削除ボタンは最小 44x44px のサイズを持つ', async () => {
      const wrapper = mount(SessionForm, {
        props: { isSubmitting: false },
      });

      // 3人にして削除ボタンを有効化
      await wrapper.find('[data-testid="add-player-button"]').trigger('click');

      const addButton = wrapper.find('[data-testid="add-player-button"]');
      const removeButtons = wrapper.findAll(
        '[data-testid="remove-player-button"]',
      );

      expect(addButton.classes()).toContain('min-h-11');
      expect(
        removeButtons.some((btn) => btn.classes().includes('min-h-11')),
      ).toBe(true);
    });
  });
});
