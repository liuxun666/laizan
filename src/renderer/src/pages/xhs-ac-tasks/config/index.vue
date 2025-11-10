<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { NForm } from 'naive-ui'
import { useTaskStore } from '@renderer/stores/xhs-ac-tasks/task'
import { useLogsStore } from '@renderer/stores/feed-ac-tasks/logs'
import { storeToRefs } from 'pinia'
import RulesConfig from './components/RulesConfig/index.vue'
import KeywordBlocking from './components/KeywordBlocking.vue'
import FormCount from './components/FormCount.vue'
import FormSearch from './components/FormSearch.vue'
import RuntimeSettings from './components/RuntimeSettings.vue'
import LoginButton from './components/LoginButton.vue'
import StartButton from './components/StartButton.vue'
import ConfigManager from './components/ConfigManager.vue'
import TemplateQuickStart from './components/TemplateQuickStart.vue'
import { useSettingsStore } from '@renderer/pages/xhs-ac-tasks/config/stores/settings'
import HistoryButton from './components/HistoryButton.vue'
import { useAuthStore } from '@renderer/stores/xhs-ac-tasks/auth'

// 使用 Pinia stores
const taskStore = useTaskStore()
const logsStore = useLogsStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const { resetTaskStatus, syncTaskStatus } = taskStore
const { addLog, setupAutoScroll } = logsStore
const { settings } = storeToRefs(settingsStore)

let offProgress: null | (() => void) = null
let offEnded: null | (() => void) = null

onMounted(async () => {
  // 加载配置
  settingsStore.loadSettings()
  await authStore.checkAuth()

  // 设置自动滚动
  setupAutoScroll()

  // 同步任务状态 - 检查是否有运行中的任务
  await syncTaskStatus()

  // 监听任务进度
  offProgress = window.api.onXHSTaskProgress((p) => {
    addLog(p.message)
  })

  // 监听任务结束
  offEnded = window.api.onXHSTaskEnded((p) => {
    resetTaskStatus()
    if (p.status === 'error') {
      addLog(`任务异常: ${p.message ?? ''}`)
    } else if (p.status === 'stopped') {
      addLog(`任务已停止`)
    } else {
      addLog(`任务完成`)
    }
  })
})

onBeforeUnmount(() => {
  offProgress?.()
  offEnded?.()
})
</script>

<template>
  <div>
    <div
      class="absolute top-0 left-0 right-0 z-10 flex items-center bg-[#101014]/50 backdrop-blur-2xl"
    >
      <div class="flex justify-between w-full p-6 pb-3">
        <HistoryButton />
        <div class="flex gap-2">
          <ConfigManager />
          <LoginButton />
          <StartButton />
        </div>
      </div>
    </div>
    <div class="flex flex-col justify-center items-center pt-26 pb-10 min-h-screen">
      <template v-if="settings">
        <n-form size="large" label-placement="left" class="w-full px-10">
          <!-- 快速导入模板组件 -->
          <TemplateQuickStart />

          <!-- 规则设置组件 -->
          <RulesConfig />

          <!-- 评论次数组件 -->
          <FormCount />
          <FormSearch />

          <!-- 运行设置组件 -->
          <RuntimeSettings />

          <!-- 关键词屏蔽设置组件 -->
          <KeywordBlocking />
        </n-form>
      </template>
      <template v-else>
        <span>配置加载中</span>
      </template>
    </div>
  </div>
</template>