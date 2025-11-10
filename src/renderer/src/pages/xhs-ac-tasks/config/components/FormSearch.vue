<template>
      <n-collapse>
        <n-collapse-item title="搜索设置" name="search">
  <n-checkbox
              v-model:checked="settings!.isSearchEnabled"
              size="small"
              @update:checked="handleSearchEnabled"
            >
              是否搜索指定关键词（默认刷recommend页面）
            </n-checkbox>
  <n-form-item label="搜索关键词：">
    <n-input
      v-model:value="settings!.searchWord"
      type="text"
      placeholder="输入搜索关键词"
      class="w-full"
      :disabled="taskStatus === 'starting'"
      @update:value="handleSearchWordChange"
    />
  </n-form-item>
  <n-form-item label="排序方式：">
    <n-select v-model:value="settings!.searchSort" :options="sortOptions" @update:value="handleSearchSortChange" />
  </n-form-item>
  <n-form-item label="时间范围：">
    <n-select v-model:value="settings!.searchTimeRange" :options="timeRangeOptions" @update:value="handleSearchTimeRangeChange" />
</n-form-item>
        </n-collapse-item>
</n-collapse>
</template>

<script setup lang="ts">
import { NFormItem, NInput, NCheckbox, NSelect, NCollapse, NCollapseItem } from 'naive-ui'
import { useTaskStore } from '@renderer/stores/xhs-ac-tasks/task'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const { taskStatus } = taskStore
const { updateExceptRuleGroup } = settingsStore
const sortOptions = [
  { label: '综合', value: '综合' },
  { label: '最新', value: '最新' },
  { label: '最多点赞', value: '最多点赞' },
  { label: '最多评论', value: '最多评论' },
  { label: '最多收藏', value: '最多收藏' },
]
const timeRangeOptions = [
  { label: '不限', value: '不限' },
  { label: '一天内', value: '一天内' },
  { label: '一周内', value: '一周内' },
  { label: '半年内', value: '半年内' },
]

// 处理searchWord变化，直接保存到配置中
const handleSearchWordChange = (): void => {
  updateExceptRuleGroup({ searchWord: settings.value!.searchWord })
}

const handleSearchEnabled = (): void => {
  updateExceptRuleGroup({ isSearchEnabled: settings.value!.isSearchEnabled })
}

const handleSearchSortChange = (): void => {
  updateExceptRuleGroup({ searchSort: settings.value!.searchSort })
}
const handleSearchTimeRangeChange = (): void => {
  updateExceptRuleGroup({ searchTimeRange: settings.value!.searchTimeRange })
}
</script>