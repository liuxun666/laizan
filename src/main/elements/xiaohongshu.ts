import { Page } from '@playwright/test'
import { random, sleep } from '@/utils/common'
import { XHSFeedItem } from '../service/xhs/types'

export default class XHSElementHandler {
  private _page?: Page

  constructor(page: Page) {
    this._page = page
  }

  // 检查评论区是否打开
  async isCommentSectionOpen(): Promise<boolean> {
    try {
      // 查找评论区元素（根据小红书的实际DOM结构调整选择器）
      const commentSection = await this._page?.$('.comments-container')
      
      if (!commentSection) {
        console.log('未找到评论区元素(.comments-container)')
        return false
      }

      // 获取元素的clientHeight属性来判断是否已展开
      const clientHeight = await commentSection.evaluate((el) => (el as HTMLElement).clientHeight)
      
      // 如果clientHeight大于0，则表示评论区已打开
      const isOpen = clientHeight > 0
      console.log(`评论区状态: ${isOpen ? '已打开' : '已关闭'} (clientHeight: ${clientHeight})`)
      
      return isOpen
    } catch (error) {
      console.log('检查评论区状态时出错:', error)
      return false
    }
  }

  // 打开评论区
  async openCommentSection(): Promise<void> {
    try {
      console.log('尝试打开评论区')
      // 点击评论按钮（根据小红书的实际DOM结构调整选择器）
      const commentButton = await this._page?.waitForSelector('.content-edit', {
        state: 'visible',
        timeout: 3000
      })
      
      if (commentButton) {
        await commentButton.click()
        console.log('成功点击评论按钮打开评论区')
        // 等待评论区展开
        await sleep(1000)
      } else {
        console.log('未找到评论按钮')
      }
    } catch (error) {
      console.log('打开评论区时出错:', error)
    }
  }

  // 关闭评论区
  async closeCommentSection(): Promise<void> {
    try {
      console.log('尝试关闭评论区')
      // 点击关闭按钮或使用ESC键关闭评论区
      await this._page?.keyboard.press('Escape')
      
      // 给评论区收起一些时间
      await sleep(500)
    } catch (error) {
      console.log('关闭评论区时出错:', error)
    }
  }

  // 点赞
  async like(): Promise<void> {
    try {
      // 点击点赞按钮（根据小红书的实际DOM结构调整选择器）
      const likeButton = await this._page?.waitForSelector('.like-wrapper', {
        state: 'visible',
        timeout: 3000
      })
      
      if (likeButton) {
        await likeButton.click()
        console.log('成功点赞')
      }
      
      // 等待点赞动画完成
      await sleep(500)
    } catch (error) {
      console.log('点赞时出错:', error)
    }
  }

  // 跳转到下一个视频/笔记
  async goToNext(): Promise<void> {
    try {
      // 检查评论区是否打开，如果打开则关闭
      const commentSectionOpen = await this.isCommentSectionOpen()
      if (commentSectionOpen) {
        console.log('检测到评论区已打开，尝试关闭评论区')
        await this.closeCommentSection()
        
        // 等待评论区关闭
        await sleep(1000)
      }

      // 使用键盘方向键向右跳转到下一个内容
      await this._page?.keyboard.press('ArrowRight')

      await sleep(1000)
      console.log('成功跳转到下一内容')

      // 等待内容加载
      try {
        // 等待内容元素出现（根据小红书的实际DOM结构调整选择器）
        await this._page?.waitForSelector('.note-item', {
          state: 'visible',
          timeout: 5000
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        console.log('等待下一个内容加载超时，继续执行')
      }
    } catch (error) {
      console.log('跳转到下一内容时出错:', error)
    }
  }

  async goToNode(node: XHSFeedItem): Promise<{ success: boolean, reason?: any }> {
    console.log(`跳转至节点：${node.id}`)
    await this._page?.goto(`https://www.xiaohongshu.com/explore/${node.id}?xsec_token=${node.xsec_token}&xsec_source=`)
    await this._page?.waitForLoadState('networkidle', { timeout: 5000 }).catch((error) => {
      console.log(`跳转至节点失败: ${node.id}`, error)
      return { success: false, reason: error }
    })
    return { success: true }
  }
}