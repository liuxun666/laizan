import { ElectronAPI } from '@electron-toolkit/preload'
import type { api } from './index'
import { FeedAcSettingsV2, FeedAcRuleGroups } from '@/shared/feed-ac-setting'
import { TaskHistoryRecord } from '@/shared/task-history'

declare global {
  interface Window {
    electron: ElectronAPI
    api: typeof api & {
      // 小红书相关API
      hasXHSAuth: () => Promise<boolean>
      loginXHS: () => Promise<void>
      getXHSSettings: () => Promise<FeedAcSettingsV2>
      clearXHSSettings: () => Promise<FeedAcSettingsV2>
      createXHSRuleGroup: (
        ruleGroupData: Omit<FeedAcRuleGroups, 'id'>,
        parentId?: string
      ) => Promise<{ ok: boolean; data?: FeedAcSettingsV2; message?: string }>
      updateXHSRuleGroup: (
        id: string,
        updates: Partial<Omit<FeedAcRuleGroups, 'id'>>
      ) => Promise<{ ok: boolean; data?: FeedAcSettingsV2; message?: string }>
      deleteXHSRuleGroup: (
        id: string
      ) => Promise<{ ok: boolean; data?: FeedAcSettingsV2; message?: string }>
      copyXHSRuleGroup: (
        id: string,
        parentId?: string
      ) => Promise<{ ok: boolean; data?: FeedAcSettingsV2; message?: string }>
      updateXHSExceptRuleGroup: (
        updates: Partial<Omit<FeedAcSettingsV2, 'ruleGroups' | 'version'>>
      ) => Promise<{ ok: boolean; data?: FeedAcSettingsV2; message?: string }>
      startXHSTask: () => Promise<{ ok: boolean; taskId?: string; message?: string }>
      stopXHSTask: () => Promise<{ ok: boolean; message?: string }>
      onXHSTaskProgress: (
        handler: (p: { type: string; message: string; timestamp: number }) => void
      ) => (() => void)
      onXHSTaskEnded: (
        handler: (p: { status: 'success' | 'stopped' | 'error'; message?: string }) => void
      ) => (() => void)
      // 小红书任务历史相关API
      getXHSTaskHistoryList: () => Promise<TaskHistoryRecord[]>
      deleteXHSTaskHistory: (taskId: string) => Promise<{ ok: boolean; message?: string }>
      getXHSTaskDetail: (taskId: string) => Promise<TaskHistoryRecord | null>
    }
  }
}