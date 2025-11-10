<template>
  <n-button
    strong
    secondary
    @click="goToHistory"
  >
    <template #icon>
      <n-icon>
        <TimeOutline />
      </n-icon>
    </template>
    任务历史
  </n-button>
</template>

<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { TimeOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'

const router = useRouter()

const goToHistory = (): void => {
  router.push('/tools/xhs-ac-tasks/history')
}
</script>