<template>
  <n-form-item label="刷视频方式：" label-placement="top">
    <n-radio-group name="flushType" v-model:value="settings!.flushType" @update:value="handleFlushTypeChange"
      :default-value="settings?.flushType || 'recommend'">
      <n-space>
        <n-radio v-for="flushType in flushTypes" :key="flushType.value" :value="flushType.value">
          {{ flushType.label }}
        </n-radio>
      </n-space>
    </n-radio-group>
  </n-form-item>
</template>

<script setup lang="ts">
import { NRadioGroup, NRadio, NSpace, NFormItem } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const { updateExceptRuleGroup } = settingsStore
const flushTypes = [
  {
    label: '推荐',
    value: 'recommend'
  },
  {
    label: '关注',
    value: 'follow'
  },
  {
    label: '搜索',
    value: 'search'
  }]

// 处理searchWord变化，直接保存到配置中
const handleFlushTypeChange = (value: "search" | "recommend" | "follow"): void => {
  updateExceptRuleGroup({ flushType: value })
}

</script>
