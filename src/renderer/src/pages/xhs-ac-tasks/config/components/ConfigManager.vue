<template>
  <n-dropdown
    trigger="hover"
    :options="options"
    @select="handleSelect"
  >
    <n-button strong secondary>
      <template #icon>
        <n-icon>
          <SettingsOutline />
        </n-icon>
      </template>
      配置管理
    </n-button>
  </n-dropdown>
</template>

<script setup lang="ts">
import { NDropdown, NButton, NIcon, useMessage } from 'naive-ui'
import { SettingsOutline } from '@vicons/ionicons5'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const settingsStore = useSettingsStore()
const {settings} = storeToRefs(settingsStore)
const message = useMessage()

const options = [
  {
    label: '重置配置',
    key: 'reset'
  },
  {
    label: '导出配置',
    key: 'export'
  },
  {
    label: '导入配置',
    key: 'import'
  }
]

const handleSelect = async (key: string): Promise<void> => {
  switch (key) {
    case 'reset':
      await handleReset()
      break
    case 'export':
      await handleExport()
      break
    case 'import':
      await handleImport()
      break
  }
}

const handleReset = async (): Promise<void> => {
  try {
    await settingsStore.resetSettings()
    message.success('配置已重置')
  } catch (error) {
    message.error(`重置配置失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const handleExport = async (): Promise<void> => {
  if (!settingsStore.settings) {
    message.warning('暂无配置可导出')
    return
  }

  try {
    const result = await window.api.exportFeedAcSettings(settingsStore.settings)
    if (result.ok && result.path) {
      message.success(`配置已导出至: ${result.path}`)
    } else {
      message.error(`导出配置失败: ${result.message ?? '未知错误'}`)
    }
  } catch (error) {
    message.error(`导出配置失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const handleImport = async (): Promise<void> => {
  try {
    const result = await window.api.pickImportFeedAcSettings()
    if (result.ok && result.data) {
      // 导入配置
      const updateResult = await window.api.importXHSSettings(result.data)
      if (updateResult.ok && updateResult.data) {
        settings.value = updateResult.data
        await settingsStore.loadSettings()
        message.success('配置导入成功')
      } else {
        message.error(`导入配置失败: ${updateResult.message ?? '未知错误'}`)
      }
    } else if (result.message) {
      message.error(`导入配置失败: ${result.message}`)
    }
  } catch (error) {
    message.error(`导入配置失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
</script>