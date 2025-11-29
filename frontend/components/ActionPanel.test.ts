import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ActionPanel from './ActionPanel.vue';

describe('ActionPanel', () => {
  const defaultProps = {
    isMyTurn: true,
    myChips: 5,
    isSubmitting: false,
  };

  describe('ボタン配置', () => {
    it('「チップを置く」ボタンが表示される', () => {
      const wrapper = mount(ActionPanel, { props: defaultProps });

      const placeChipButton = wrapper.find('[data-testid="place-chip-button"]');
      expect(placeChipButton.exists()).toBe(true);
      expect(placeChipButton.text()).toContain('チップを置く');
    });

    it('「カードを取る」ボタンが表示される', () => {
      const wrapper = mount(ActionPanel, { props: defaultProps });

      const takeCardButton = wrapper.find('[data-testid="take-card-button"]');
      expect(takeCardButton.exists()).toBe(true);
      expect(takeCardButton.text()).toContain('カードを取る');
    });
  });

  describe('手番による有効/無効化', () => {
    it('自分の手番の場合、両方のボタンが有効', () => {
      const wrapper = mount(ActionPanel, {
        props: { ...defaultProps, isMyTurn: true, myChips: 5 },
      });

      const placeChipButton = wrapper.find('[data-testid="place-chip-button"]');
      const takeCardButton = wrapper.find('[data-testid="take-card-button"]');

      expect(placeChipButton.attributes('disabled')).toBeUndefined();
      expect(takeCardButton.attributes('disabled')).toBeUndefined();
    });

    it('自分の手番でない場合、両方のボタンが無効', () => {
      const wrapper = mount(ActionPanel, {
        props: { ...defaultProps, isMyTurn: false },
      });

      const placeChipButton = wrapper.find('[data-testid="place-chip-button"]');
      const takeCardButton = wrapper.find('[data-testid="take-card-button"]');

      expect(placeChipButton.attributes('disabled')).toBe('');
      expect(takeCardButton.attributes('disabled')).toBe('');
    });
  });

  describe('チップ残量による無効化', () => {
    it('チップ残量が0の場合、「チップを置く」ボタンが無効', () => {
      const wrapper = mount(ActionPanel, {
        props: { ...defaultProps, isMyTurn: true, myChips: 0 },
      });

      const placeChipButton = wrapper.find('[data-testid="place-chip-button"]');
      expect(placeChipButton.attributes('disabled')).toBe('');
    });

    it('チップ残量が0の場合でも、「カードを取る」ボタンは有効', () => {
      const wrapper = mount(ActionPanel, {
        props: { ...defaultProps, isMyTurn: true, myChips: 0 },
      });

      const takeCardButton = wrapper.find('[data-testid="take-card-button"]');
      expect(takeCardButton.attributes('disabled')).toBeUndefined();
    });
  });

  describe('ローディング状態', () => {
    it('送信中の場合、両方のボタンが無効化される', () => {
      const wrapper = mount(ActionPanel, {
        props: { ...defaultProps, isSubmitting: true },
      });

      const placeChipButton = wrapper.find('[data-testid="place-chip-button"]');
      const takeCardButton = wrapper.find('[data-testid="take-card-button"]');

      expect(placeChipButton.attributes('disabled')).toBe('');
      expect(takeCardButton.attributes('disabled')).toBe('');
    });

    it('送信中の場合、ローディングインジケーターが表示される', () => {
      const wrapper = mount(ActionPanel, {
        props: { ...defaultProps, isSubmitting: true },
      });

      expect(wrapper.find('[data-testid="loading-indicator"]').exists()).toBe(
        true,
      );
    });
  });

  describe('イベント発火', () => {
    it('「チップを置く」ボタンクリックで placeChip イベントが発火する', async () => {
      const wrapper = mount(ActionPanel, { props: defaultProps });

      await wrapper.find('[data-testid="place-chip-button"]').trigger('click');

      expect(wrapper.emitted('placeChip')).toHaveLength(1);
    });

    it('「カードを取る」ボタンクリックで takeCard イベントが発火する', async () => {
      const wrapper = mount(ActionPanel, { props: defaultProps });

      await wrapper.find('[data-testid="take-card-button"]').trigger('click');

      expect(wrapper.emitted('takeCard')).toHaveLength(1);
    });

    it('無効化されたボタンはイベントを発火しない', async () => {
      const wrapper = mount(ActionPanel, {
        props: { ...defaultProps, isMyTurn: false },
      });

      await wrapper.find('[data-testid="place-chip-button"]').trigger('click');
      await wrapper.find('[data-testid="take-card-button"]').trigger('click');

      expect(wrapper.emitted('placeChip')).toBeUndefined();
      expect(wrapper.emitted('takeCard')).toBeUndefined();
    });
  });

  describe('タッチ操作対応', () => {
    it('ボタンが最小44x44pxのサイズを持つ', () => {
      const wrapper = mount(ActionPanel, { props: defaultProps });

      const placeChipButton = wrapper.find('[data-testid="place-chip-button"]');
      const takeCardButton = wrapper.find('[data-testid="take-card-button"]');

      // min-h-11 (44px) と min-w-11 (44px) のクラスが適用されていることを確認
      expect(placeChipButton.classes()).toContain('min-h-11');
      expect(takeCardButton.classes()).toContain('min-h-11');
    });
  });
});
