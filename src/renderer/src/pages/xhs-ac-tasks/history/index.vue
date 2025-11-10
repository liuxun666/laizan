<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">小红书任务历史</h1>
      <n-button @click="loadHistory">
        <template #icon>
          <n-icon>
            <RefreshOutline />
          </n-icon>
        </template>
        刷新
      </n-button>
    </div>

    <n-list bordered>
      <n-list-item v-for="record in historyRecords" :key="record.id">
        <div class="flex justify-between items-center">
          <div>
            <div class="font-medium">
              任务 #{{ record.id.slice(0, 8) }}
              <n-tag :type="getStatusType(record.status)" size="small" class="ml-2">
                {{ getStatusText(record.status) }}
              </n-tag>
            </div>
            <div class="text-gray-500 text-sm mt-1">
              {{ formatTime(record.startTime) }} - {{ formatTime(record.endTime || undefined) }}
              <span class="mx-2">|</span>
              评论 {{ record.videoRecords.filter(r => r.isCommented).length }} 条
            </div>
          </div>
          <div class="flex gap-2">
            <n-button text @click="viewDetail(record.id)">
              <template #icon>
                <n-icon>
                  <EyeOutline />
                </n-icon>
              </template>
              查看详情
            </n-button>
            <n-button text type="error" @click="deleteRecord(record.id)">
              <template #icon>
                <n-icon>
                  <TrashOutline />
                </n-icon>
              </template>
              删除
            </n-button>
          </div>
        </div>
      </n-list-item>
      <n-list-item v-if="historyRecords.length === 0">
        <div class="text-center py-8 text-gray-500">
          暂无任务历史记录
        </div>
      </n-list-item>
    </n-list>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NList, NListItem, NButton, NIcon, NTag, useMessage } from 'naive-ui'
import { RefreshOutline, EyeOutline, TrashOutline } from '@vicons/ionicons5'
import { TaskHistoryRecord } from '@/shared/task-history'
import { useHistoryStore } from './stores/history'

const router = useRouter()
const message = useMessage()
const historyStore = useHistoryStore()
const historyRecords = ref<TaskHistoryRecord[]>([])

onMounted(() => {
  loadHistory()
})

const loadHistory = async (): Promise<void> => {
  try {
    const records = await window.api.getXHSTaskHistoryList()
    historyRecords.value = records
  } catch (error) {
    message.error(`加载任务历史失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const viewDetail = (taskId: string): void => {
  router.push(`/tools/xhs-ac-tasks/detail/${taskId}`)
}

const deleteRecord = async (taskId: string): Promise<void> => {
  try {
    const result = await window.api.deleteXHSTaskHistory(taskId)
    if (result.ok) {
      message.success('删除成功')
      await loadHistory()
    } else {
      message.error('删除失败')
    }
  } catch (error) {
    message.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const getStatusType = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'completed': return 'success'
    case 'stopped': return 'warning'
    case 'error': return 'error'
    default: return 'info'
  }
}

const getStatusText = (status: string): string => {
  switch (status) {
    case 'completed': return '已完成'
    case 'running': return '运行中'
    case 'stopped': return '已停止'
    case 'error': return '错误'
    default: return status
  }
}

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '未知时间'
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>