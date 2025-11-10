import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TaskHistoryRecord } from '@/shared/task-history'

export const useDetailStore = defineStore('xhs-detail', () => {
  const taskDetail = ref<TaskHistoryRecord | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadTaskDetail = async (taskId: string): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const detail = await window.api.getXHSTaskDetail(taskId)
      taskDetail.value = detail
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载任务详情失败'
      taskDetail.value = null
    } finally {
      loading.value = false
    }
  }

  const clearDetail = (): void => {
    taskDetail.value = null
    error.value = null
  }

  return {
    taskDetail,
    loading,
    error,
    loadTaskDetail,
    clearDetail
  }
})