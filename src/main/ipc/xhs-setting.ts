import { ipcMain } from 'electron'
import { getXHSSettings, updateXHSSettings } from '../service/xhs/settings'
import { FeedAcRuleGroups, FeedAcSettingsV2 } from '@/shared/feed-ac-setting'
import { nanoid } from 'nanoid'

// 获取小红书配置
ipcMain.handle('xhs-setting:get', async () => {
  return getXHSSettings()
})

// 导入小红书配置
ipcMain.handle('xhs-setting:import', async (event, settings: FeedAcSettingsV2) => {
  updateXHSSettings(settings)
  return { ok: true, data: settings }
})

// 清空小红书配置
ipcMain.handle('xhs-setting:clear', async () => {
  const defaultSettings: FeedAcSettingsV2 = {
    version: 'v2',
    ruleGroups: [],
    blockKeywords: [],
    authorBlockKeywords: [],
    simulateWatchBeforeComment: true,
    watchTimeRangeSeconds: [5, 15],
    onlyCommentActiveVideo: true,
    maxCount: 10,
    flushType: 'recommend',
    isSearchEnabled: false,
    searchWord: '',
    searchSort: '综合排序',
    searchTimeRange: '不限'
  }
  updateXHSSettings(defaultSettings)
  return defaultSettings
})

// 创建规则组
ipcMain.handle(
  'xhs-setting:createRuleGroup',
  async (_event, ruleGroupData: Omit<FeedAcRuleGroups, 'id'>, parentId?: string) => {
    try {
      const settings = getXHSSettings()
      const newRuleGroup: FeedAcRuleGroups = {
        ...ruleGroupData,
        id: nanoid()
      }

      if (parentId) {
        // 添加到指定父规则组的子规则组中
        const findAndAddToParent = (groups: FeedAcRuleGroups[]): boolean => {
          for (const group of groups) {
            if (group.id === parentId) {
              if (!group.children) {
                group.children = []
              }
              group.children.push(newRuleGroup)
              return true
            }
            if (group.children && findAndAddToParent(group.children)) {
              return true
            }
          }
          return false
        }

        findAndAddToParent(settings.ruleGroups)
      } else {
        // 添加到根规则组
        settings.ruleGroups.push(newRuleGroup)
      }

      updateXHSSettings(settings)
      return { ok: true, data: settings }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  }
)

// 更新规则组
ipcMain.handle(
  'xhs-setting:updateRuleGroup',
  async (_event, id: string, updates: Partial<Omit<FeedAcRuleGroups, 'id'>>) => {
    try {
      const settings = getXHSSettings()

      const findAndUpdate = (groups: FeedAcRuleGroups[]): boolean => {
        for (const group of groups) {
          if (group.id === id) {
            Object.assign(group, updates)
            return true
          }
          if (group.children && findAndUpdate(group.children)) {
            return true
          }
        }
        return false
      }

      findAndUpdate(settings.ruleGroups)

      updateXHSSettings(settings)
      return { ok: true, data: settings }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  }
)

// 删除规则组
ipcMain.handle('xhs-setting:deleteRuleGroup', async (_event, id: string) => {
  try {
    const settings = getXHSSettings()

    const findAndDelete = (groups: FeedAcRuleGroups[]): boolean => {
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].id === id) {
          groups.splice(i, 1)
          return true
        }
        if (groups[i].children && findAndDelete(groups[i].children!)) {
          return true
        }
      }
      return false
    }

    findAndDelete(settings.ruleGroups)

    updateXHSSettings(settings)
    return { ok: true, data: settings }
  } catch (error) {
    return { ok: false, message: String(error) }
  }
})

// 复制规则组
ipcMain.handle('xhs-setting:copyRuleGroup', async (_event, id: string, parentId?: string) => {
  try {
    const settings = getXHSSettings()

    // 深拷贝规则组的函数
    const deepCopyRuleGroup = (group: FeedAcRuleGroups): FeedAcRuleGroups => {
      const newGroup: FeedAcRuleGroups = {
        ...group,
        id: nanoid()
      }
      if (newGroup.children) {
        newGroup.children = newGroup.children.map(deepCopyRuleGroup)
      }
      return newGroup
    }

    // 查找要复制的规则组
    const findGroup = (groups: FeedAcRuleGroups[]): FeedAcRuleGroups | null => {
      for (const group of groups) {
        if (group.id === id) {
          return group
        }
        if (group.children) {
          const found = findGroup(group.children)
          if (found) {
            return found
          }
        }
      }
      return null
    }

    const groupToCopy = findGroup(settings.ruleGroups)
    if (!groupToCopy) {
      return { ok: false, message: '未找到要复制的规则组' }
    }

    const copiedGroup = deepCopyRuleGroup(groupToCopy)

    if (parentId) {
      // 添加到指定父规则组的子规则组中
      const findAndAddToParent = (groups: FeedAcRuleGroups[]): boolean => {
        for (const group of groups) {
          if (group.id === parentId) {
            if (!group.children) {
              group.children = []
            }
            group.children.push(copiedGroup)
            return true
          }
          if (group.children && findAndAddToParent(group.children)) {
            return true
          }
        }
        return false
      }

      findAndAddToParent(settings.ruleGroups)
    } else {
      // 添加到根规则组
      settings.ruleGroups.push(copiedGroup)
    }

    updateXHSSettings(settings)
    return { ok: true, data: settings }
  } catch (error) {
    return { ok: false, message: String(error) }
  }
})

// 更新除规则组外的配置
ipcMain.handle(
  'xhs-setting:updateExceptRuleGroup',
  async (_event, updates: Partial<Omit<FeedAcSettingsV2, 'ruleGroups' | 'version'>>) => {
    try {
      const settings = getXHSSettings()
      Object.assign(settings, updates)
      updateXHSSettings(settings)
      return { ok: true, data: settings }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  }
)

export function registerXHSSettingIPC(): void {
  // IPC handlers are already registered above
  console.log('XHS setting IPC handlers registered')
}