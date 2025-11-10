import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TaskHistoryRecord } from '@/shared/task-history'

export const useHistoryStore = defineStore('xhs-history', () => {
  const historyRecords = ref<TaskHistoryRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const sortedHistoryRecords = computed(() => {
    return [...historyRecords.value].sort((a, b) => b.startTime - a.startTime)
  })

  const loadHistory = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const records = await window.api.getXHSTaskHistoryList()
      historyRecords.value = records
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载任务历史失败'
    } finally {
      loading.value = false
    }
  }

  const deleteHistory = async (taskId: string): Promise<boolean> => {
    try {
      const result = await window.api.deleteXHSTaskHistory(taskId)
      if (result.ok) {
        historyRecords.value = historyRecords.value.filter(record => record.id !== taskId)
        return true
      }
      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除任务历史失败'
      return false
    }
  }

  const clearHistory = async (): Promise<boolean> => {
    try {
      // 获取所有小红书任务历史并逐个删除
      const records = await window.api.getXHSTaskHistoryList()
      let success = true
      for (const record of records) {
        const result = await window.api.deleteXHSTaskHistory(record.id)
        if (!result.ok) {
          success = false
        }
      }
      if (success) {
        historyRecords.value = []
        return true
      }
      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '清空任务历史失败'
      return false
    }
  }

  return {
    historyRecords,
    sortedHistoryRecords,
    loading,
    error,
    loadHistory,
    deleteHistory,
    clearHistory
  }
})