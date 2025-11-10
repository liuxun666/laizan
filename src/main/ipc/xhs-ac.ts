import { ipcMain } from 'electron'
import XHSACTask, { loginAndStorageStateXHS } from '../service/xhs'
import { storage, StorageKey } from '../utils/storage'
import { taskHistoryService } from '../service/task-history'

let currentTask: XHSACTask | null = null

export function setupXHSACIPC(): void {
  // 登录小红书账号
  ipcMain.handle('xhs-ac:login', async () => {
    try {
      await loginAndStorageStateXHS()
      return { success: true }
    } catch (error) {
      console.error('登录小红书账号失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('xhs-ac:logout', async () => {
    try {
      await storage.delete(StorageKey.authXHS)
      return { success: true }
    } catch (error) {
      console.error('退出小红书账号失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 检查是否已登录
  ipcMain.handle('xhs-ac:check-auth', async () => {
    return storage.get(StorageKey.authXHS) != null
  })

  // 开始自动评论任务
  ipcMain.handle('xhs-ac:start-task', async (_event, taskId: string) => {
    try {
      if (currentTask) {
        return { success: false, error: '已有正在运行的任务' }
      }

      currentTask = new XHSACTask(taskId)
      
      // 监听任务进度
      currentTask.on('progress', (data) => {
        // 向渲染进程发送进度更新
        _event.sender.send('xhs-ac:task-progress', data)
      })

      // 启动任务
      const result = await currentTask.run()
      currentTask = null
      return { success: true, taskId: result }
    } catch (error) {
      currentTask = null
      console.error('启动小红书自动评论任务失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 停止自动评论任务
  ipcMain.handle('xhs-ac:stop-task', async () => {
    try {
      if (currentTask) {
        await currentTask.stop()
        currentTask = null
        return { success: true }
      }
      return { success: false, error: '没有正在运行的任务' }
    } catch (error) {
      currentTask = null
      console.error('停止小红书自动评论任务失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 检查任务状态
  ipcMain.handle('xhs-ac:task-status', async () => {
    return { running: currentTask !== null }
  })
  
  // 获取任务历史列表
  ipcMain.handle('xhs-ac:get-task-history', async () => {
    try {
      const records = await taskHistoryService.getTaskList()
      // 过滤出小红书相关的任务记录
      const xhsRecords = records.filter(record => record.platform === 'xhs')
      return xhsRecords
    } catch (error) {
      console.error('获取小红书任务历史失败:', error)
      return []
    }
  })
  
  // 删除任务历史记录
  ipcMain.handle('xhs-ac:delete-task-history', async (_event, taskId: string) => {
    try {
      await taskHistoryService.deleteTask(taskId)
      return { success: true }
    } catch (error) {
      console.error('删除小红书任务历史失败:', error)
      return { success: false, error: String(error) }
    }
  })
  
  // 获取任务详情
  ipcMain.handle('xhs-ac:get-task-detail', async (_event, taskId: string) => {
    try {
      const record = await taskHistoryService.getTaskDetail(taskId)
      if (record && record.platform === 'xhs') {
        return record
      }
      return null
    } catch (error) {
      console.error('获取小红书任务详情失败:', error)
      return null
    }
  })
}