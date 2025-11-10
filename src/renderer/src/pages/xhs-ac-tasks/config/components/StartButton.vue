<template>
  <n-button
    strong
    primary
    :type="taskStore.isRunning ? 'error' : 'primary'"
    :loading="taskStore.taskStatus === 'starting'"
    :disabled="taskStore.isRunning || !authStore.hasAuth"
    @click="handleStartStop"
  >
          <template #icon>
          <NIcon>
            <PlayOutline />
          </NIcon>
        </template>
    {{ taskStore.isRunning ? '停止任务' : '开始任务' }}
  </n-button>
</template>

<script setup lang="ts">
import { NButton, NIcon, useMessage } from 'naive-ui'
import { useTaskStore } from '@renderer/stores/xhs-ac-tasks/task'
import { useAuthStore } from '@renderer/stores/xhs-ac-tasks/auth'
import { PlayOutline } from '@vicons/ionicons5'
const taskStore = useTaskStore()
const message = useMessage()
const authStore = useAuthStore()


const handleStartStop = async (): Promise<void> => {
  if (!authStore.hasAuth){
    message.warning('请先登录')
    return
  }
  if (taskStore.isRunning) {
    // 停止任务
    try {
      await taskStore.stop()
      message.success('任务已停止')
    } catch (error) {
      message.error(`停止任务失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  } else {
    // 开始任务前检查是否已登录
    const hasXHSAuth = await window.api.hasXHSAuth()
    if (!hasXHSAuth) {
      message.warning('请先登录小红书账号')
      return
    }

    // 开始任务
    try {
      await taskStore.start()
      message.success('任务已启动')
    } catch (error) {
      message.error(`启动任务失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
}
</script>