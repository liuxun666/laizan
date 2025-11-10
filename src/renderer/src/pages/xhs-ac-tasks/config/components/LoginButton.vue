<template>
  <n-button
    strong
    secondary
    :type="taskStore.isRunning ? 'error' : 'primary'"
    :loading="taskStore.taskStatus === 'starting'"
    :disabled="taskStore.isRunning"
    @click="handleSwitchLogin"
  >
    {{ !authStore.hasAuth ? '请先登录' : '退出登录' }}
  </n-button>
</template>

<script setup lang="ts">
import { NButton, useMessage } from 'naive-ui'
import { useTaskStore } from '@renderer/stores/xhs-ac-tasks/task'
import { useAuthStore } from '@renderer/stores/xhs-ac-tasks/auth'

const taskStore = useTaskStore()
const message = useMessage()
const authStore = useAuthStore()


const handleSwitchLogin = async (): Promise<void> => {
  if (!authStore.hasAuth){
    await authStore.login()
    message.info('登录成功')
    return
  }else{
    await authStore.logout()
    message.info('退出登录成功')
  return  
  }
}
</script>