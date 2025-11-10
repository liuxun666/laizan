import { ref, onMounted } from 'vue'
import { AISettings } from '@/shared/ai-setting'

const aiSettings = ref<AISettings>()
const loading = ref(false)
const error = ref<string | null>(null)

export function useAiSettings() {
  const loadAiSettings = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      aiSettings.value = await window.api.getAISettings()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载AI设置失败'
    } finally {
      loading.value = false
    }
  }

  const updateAiSettings = async (payload: Partial<AISettings>): Promise<void> => {
    if (!aiSettings.value) return
    
    loading.value = true
    error.value = null
    try {
      const updated = await window.api.updateAISettings(payload)
      aiSettings.value = updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新AI设置失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearAiSettings = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const cleared = await window.api.clearAISettings()
      aiSettings.value = cleared
    } catch (err) {
      error.value = err instanceof Error ? err.message : '清空AI设置失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadAiSettings()
  })

  return {
    aiSettings,
    loading,
    error,
    loadAiSettings,
    updateAiSettings,
    clearAiSettings
  }
}