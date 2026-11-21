<template>
  <div class="video-list">
    <button
      v-for="item in pages"
      :key="item.page"
      type="button"
      class="video-item"
      :class="{ active: selected.includes(item.page), current: item.page === currentPage }"
      :disabled="!isVip && item.badge === '会员'"
      :aria-pressed="selected.includes(item.page)"
      @click="$emit('toggle', item.page)">
      <span class="selection" aria-hidden="true">{{ selected.includes(item.page) ? '✓' : '' }}</span>
      <span class="title">
        <template v-for="(part, index) in highlightParts(item.title || item.showTitle, keyword)" :key="index">
          <mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template>
        </template>
      </span>
      <span v-if="item.page === currentPage" class="current-label">当前视频</span>
      <span v-if="item.badge" class="badge">{{ item.badge }}</span>
      <span class="duration">{{ item.duration }}</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { Page } from '../../type'
import { highlightParts } from './pageUtils'

defineProps<{ pages: Page[], selected: number[], currentPage: number | null, keyword: string, isVip: boolean }>()
defineEmits(['toggle'])
</script>

<style scoped lang="less">
.video-list { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.video-item {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px;
  border: 1px solid #e8e8e8; border-radius: 6px; background: #fff; text-align: left;
  cursor: pointer; color: inherit;
  &:hover:not(:disabled) { border-color: @primary-color2; background: #f0faff; }
  &.active { border-color: @primary-color2; background: #e6f7ff; }
  &.current { border-left: 4px solid @primary-color; }
  &:disabled { cursor: not-allowed; color: #aaa; background: #f7f7f7; }
}
.selection { flex: none; width: 17px; height: 17px; line-height: 15px; text-align: center; border: 1px solid #aaa; border-radius: 3px; }
.active .selection { color: white; background: @primary-color2; border-color: @primary-color2; }
.title { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.current-label, .badge { flex: none; color: @primary-color; font-size: 12px; }
.duration { flex: none; color: #888; font-size: 12px; }
mark { background: #ffe58f; color: #222; }
</style>
