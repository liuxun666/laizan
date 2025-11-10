import { Browser, chromium, Page } from '@playwright/test'
import { random, sleep } from '@/utils/common'
import { storage, StorageKey } from '../../utils/storage'
import XHSElementHandler from '../../elements/xiaohongshu'
import { EventEmitter } from 'events'
import { getXHSSettings } from '../xhs/settings'
import { FeedAcRuleGroups, FeedAcSettingsV2 } from '@/shared/feed-ac-setting'
import { taskHistoryService } from '../task-history'
import { VideoRecord } from '@/shared/task-history'
import { XHSFeedItem } from './types'
import { Queue } from '@/main/utils/queue'

export async function loginAndStorageStateXHS(): Promise<void> {
  const execPath = storage.get(StorageKey.browserExecPath)
  if (!execPath) {
    throw new Error('Browser executable path not found')
  }
  const browser = await chromium.launch({
    executablePath: execPath,
    headless: false
  })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('https://www.xiaohongshu.com')
  // 等待登录面板显示
  await page
    .waitForSelector('.login-container', {
      state: 'visible',
      timeout: 6000
    })
    .catch(() => null)

  // 等待一分钟用户登录
  await page
    .waitForSelector('.login-container', {
      state: 'hidden',
      timeout: 1000 * 60 * 3
    })
    .catch(() => null)
  // 等待登录数据存入缓存
  await sleep(1000)
  const state = await context.storageState()
  const xhsOrigin = state.origins.find((o) => o.origin === 'https://www.xiaohongshu.com')
  if (xhsOrigin == null) {
    await context.close()
    await browser.close()
    return
  }
  let isLogin = false
  const usesElement = await page.waitForSelector('.main-container .user', { timeout: 10000 })
  if(usesElement){
    isLogin = await page.locator('.main-container .user').getByRole('link', { name: '我' }).isVisible()
  }else{
    console.log('未获取到用户节点')
  }
  if (isLogin) {
    storage.set(StorageKey.authXHS, state)
    console.log('小红书登录成功')
  }
  await context.close()
  await browser.close()
}

export default class XHSACTask extends EventEmitter {
  private _browser?: Browser
  private _page?: Page
  private _xhsElementHandler!: XHSElementHandler
  private _stopped: boolean = false
  private _taskId: string // 任务历史记录 ID
  private _currentContentStartTime?: number // 当前内容开始时间
  private _feedCache = new Queue<XHSFeedItem>()

  constructor(taskId: string) {
    super()
    this._taskId = taskId
    // 创建任务记录时指定平台为小红书
    taskHistoryService.createTask(getXHSSettings(), 'xhs')
  }

  async _launch(): Promise<void> {
    const execPath = storage.get(StorageKey.browserExecPath)
    if (!execPath) {
      throw new Error('Browser executable path not found')
    }
    const browser = await chromium.launch({
      executablePath: execPath,
      headless: false
    })
    const context = await browser.newContext({
      storageState: storage.get(StorageKey.authXHS) ?? {}
    })
    this._browser = browser
    this._page = await context.newPage()
    await this._setupVideoDataListener()
    this._page.goto('https://www.xiaohongshu.com')
    this._xhsElementHandler = new XHSElementHandler(this._page)
  }

  public async run(): Promise<string> {
    const settings = getXHSSettings()
    await this._launch()
    console.log(`小红书任务已启动，ID: ${this._taskId}`)
    if (settings.isSearchEnabled) {
      await this.searchByConfig(settings)
    }

    // 等待内容加载
    await this._page!.waitForSelector('.note-item', {
      state: 'visible'
    })
    console.log('内容已加载完成')
    this._emitProgress('loaded', '内容已加载完成')
      // 设置视频数据监听
    console.log('视频数据监听已设置')
    this._emitProgress('ready', '视频数据监听已设置')

    let commentCount = 0 // 记录已评论次数
    const maxCount = settings.maxCount || 10
    const processedCount = 0
    while (commentCount < maxCount) {
      if (this._stopped) {
        throw new Error('Task stopped')
      }
      const feedItem = this._feedCache.dequeue()
      if(feedItem){
        this._emitProgress('processing', `开始处理第 ${processedCount} 个内容，已评论次数：${commentCount}/${maxCount}`)
        console.log(`当前处理笔记：${feedItem.id} ${feedItem?.note_card?.display_title}`)
        // 获取当前内容信息（简化处理，实际需要根据小红书的DOM结构获取）
        const contentInfo = {
          id: feedItem.id,
          author: { nickname: feedItem.note_card?.user?.nickname || '' },
          desc: feedItem.note_card?.display_title || '',
          tags: []
        }

        // 关键词屏蔽（基于设置）
        const hitAuthorBlock = (settings.authorBlockKeywords || []).some((keyword) =>
          contentInfo.author.nickname.includes(keyword)
        )
        const hitBlock = (settings.blockKeywords || []).some((keyword) =>
          contentInfo.desc.includes(keyword)
        )

        if (hitBlock || hitAuthorBlock) {
          console.log(
            `内容${hitBlock ? '描述' : '作者'}命中屏蔽关键词，跳过该内容。` +
              (hitBlock
                ? `屏蔽关键词: ${settings.blockKeywords
                    .filter((k) => contentInfo.desc.includes(k))
                    .join(',')} 内容描述: ${contentInfo.desc}`
                : `屏蔽关键词: ${settings.authorBlockKeywords
                    .filter((k) => contentInfo.author.nickname.includes(k))
                    .join(',')} 内容作者: ${contentInfo.author.nickname}`)
          )
          this._emitProgress('skip-blocked', '命中屏蔽关键词，跳过该内容')
          // 记录命中屏蔽关键词
          this._recordContentSkip(contentInfo.id, '命中屏蔽关键词', contentInfo)
          await sleep(random(1500, 3000))
          await this._xhsElementHandler.goToNext()
          continue
        }

        // 分析内容是否需要评论与是否需要模拟观看
        const contentAnalysis = await this._analyzeContentType(contentInfo, settings)

        if (contentAnalysis.shouldViewComment) {
          console.log('内容需要评论')
          try {
            const element = await this._page!.waitForSelector(`a[href*="${feedItem.id}?xsec_token"]`, { timeout: 5000 })
            await element.click({ timeout: 5000 });
          } catch (error) {
            console.log('未找到内容节点，跳过该笔记')
            continue
          }
          // const res = await this._xhsElementHandler.goToNode(feedItem)
          // if (!res.success) {
          //   console.log('跳转至节点失败，跳过该内容')
          //   this._emitProgress('skip-node', '跳转至节点失败')
          //   // 记录跳转节点失败
          //   this._recordContentSkip(contentInfo.id, '跳转至节点失败', contentInfo)
          //   await sleep(random(1000, 2000))
          //   continue
          // }
          // 针对需要评论的内容，若需要模拟观看，则先观看再评论
          if (contentAnalysis.shouldSimulateWatch) {
            const watchTime = this._calculateWatchTime(settings)
            console.log(`先模拟观看 ${watchTime / 1000} 秒`)
            this._emitProgress('watch', `模拟观看 ${Math.floor(watchTime / 1000)} 秒`)
            await sleep(watchTime)
          }

          await this._randomLike()

          // 打开评论区
          console.log('打开评论区并监听评论接口')
          this._emitProgress('open-comment', '打开评论区并监听评论接口')
          await this._xhsElementHandler.openCommentSection()

          // 浏览评论区2～4秒
          console.log('浏览评论区2-4秒')
          this._emitProgress('browse-comment', '浏览评论区2-4秒')
          await sleep(random(2000, 4000))

          console.log('尝试发布评论')
          this._emitProgress('try-comment', '尝试发布评论')
          const commentResult = await this._postComment(contentAnalysis.matchedRuleGroup)
          if (commentResult.success) {
            commentCount++
            // 记录评论成功
            this._recordContentComment(contentInfo.id, contentInfo, commentResult.commentText || '')
            console.log(`评论发送成功，已评论次数：${commentCount}/${maxCount}`)
            this._emitProgress('comment-success', `评论成功 ${commentCount}/${maxCount}`)
            await sleep(random(1000, 3000))
            console.log('关闭评论区')
            await this._xhsElementHandler.closeCommentSection()
            await sleep(random(1000, 2000))
            if (commentCount >= maxCount) {
              console.log(`已达到评论次数限制 ${maxCount}，任务完成`)
              this._emitProgress('completed', `已达到评论次数限制 ${maxCount}，任务完成`)
              break
            }
          } else {
            console.log('评论发送失败，尝试关闭评论区')
            this._emitProgress('comment-fail', '评论发送失败')
            // 记录评论失败
            this._recordContentSkip(
              contentInfo.id,
              commentResult.reason || '评论发布接口返回错误',
              contentInfo
            )
            try {
              await this._xhsElementHandler.closeCommentSection()
            } catch (closeError) {
              console.log('关闭评论区失败:', closeError)
            }
            await sleep(random(1000, 2000))
          }
        }else{
          console.log('内容不需要评论')
          this._emitProgress('fast-skip', '内容不需要评论')
          // 记录规则不匹配
          this._recordContentSkip(contentInfo.id, '不满足评论规则', contentInfo)
          await sleep(random(500, 1000))
        }
      }else{
          await sleep(random(1500, 3000))
          console.log('没有更多内容，等待3-5秒后, 向下滚动')
          await this.scroll(this._page, random(500, 2000))
      }
    }
    await this._close()
    return this._taskId
  }

  public async stop(): Promise<void> {
    this._stopped = true
    await this._close()
  }

  private async _close(): Promise<void> {
    if (!this._page || !this._browser) return
    // 在关闭页面前更新本地登录缓存，避免下次仍然使用初始缓存
    const context = this._page.context()
    const state = await context.storageState()
    storage.set(StorageKey.authXHS, state)

    this._page.close()
    this._browser.close()

    this._page = undefined
    this._browser = undefined
  }

  private _emitProgress(type: string, message: string): void {
    this.emit('progress', { type, message, timestamp: Date.now() })
  }

  // 根据配置设置内容浏览时间
  _calculateWatchTime(settings: ReturnType<typeof getXHSSettings>): number {
    const [minSeconds, maxSeconds] = settings.watchTimeRangeSeconds || [5, 15]
    const watchTime = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds
    console.log(`计算浏览时间: ${watchTime}秒 (基于用户设置 ${minSeconds}-${maxSeconds} 秒)`)
    return watchTime * 1000
  }

  // 递归匹配规则组 - 同级规则组只要有一个匹配成功就停止
  async _matchRuleGroups(
    ruleGroups: FeedAcRuleGroups[],
    contentInfo: any
  ): Promise<FeedAcRuleGroups | null> {
    for (const ruleGroup of ruleGroups) {
      const matched = await this._matchRuleGroup(ruleGroup, contentInfo)
      if (matched) {
        return matched
      }
    }
    return null
  }

  // 匹配单个规则组 - 如果匹配成功且有子规则组，必须继续匹配子规则组
  async _matchRuleGroup(
    ruleGroup: FeedAcRuleGroups,
    contentInfo: any
  ): Promise<FeedAcRuleGroups | null> {
    let currentRuleGroupMatched = false
    // 如果是AI判断类型
    if (ruleGroup.type === 'ai' && ruleGroup.aiPrompt) {
      // 小红书暂时不支持AI判断
      currentRuleGroupMatched = false
    }

    // 如果是手动配置类型
    if (ruleGroup.type === 'manual' && ruleGroup.rules && ruleGroup.rules.length > 0) {
      const relation = ruleGroup.relation || 'or'
      const matches = ruleGroup.rules.map((rule) => {
        if (!rule || !rule.keyword) return false
        if (rule.field === 'nickName') {
          return contentInfo.author.nickname.includes(rule.keyword)
        }
        if (rule.field === 'videoDesc') {
          return (contentInfo.desc || '').includes(rule.keyword)
        }
        if (rule.field === 'videoTag') {
          return (contentInfo.tags || []).some((t: string) => t.includes(rule.keyword))
        }
        return false
      })

      currentRuleGroupMatched = relation === 'and' ? matches.every(Boolean) : matches.some(Boolean)

      if (currentRuleGroupMatched) {
        console.log(`手动规则组 "${ruleGroup.name}" 匹配成功`)
      }
    }

    // 如果当前规则组匹配成功
    if (currentRuleGroupMatched) {
      // 如果有子规则组，必须继续匹配子规则组
      if (ruleGroup.children && ruleGroup.children.length > 0) {
        const matchedChild = await this._matchRuleGroups(ruleGroup.children, contentInfo)
        if (matchedChild) {
          return matchedChild
        } else {
          // 子规则组没有匹配成功，当前规则组也不算匹配成功
          return null
        }
      } else {
        // 没有子规则组，当前规则组就是最终匹配的规则组
        return ruleGroup
      }
    }

    return null
  }

  // 根据用户配置的规则判断是否需要评论及是否需要模拟观看
  async _analyzeContentType(
    contentInfo: any,
    settings: FeedAcSettingsV2
  ): Promise<{
    shouldSimulateWatch: boolean
    shouldViewComment: boolean
    matchedRuleGroup?: FeedAcRuleGroups
  }> {
    // 使用V2规则组匹配
    const matchedRuleGroup = await this._matchRuleGroups(settings.ruleGroups, contentInfo)

    // 如果没有匹配的规则组，直接返回不观看
    if (!matchedRuleGroup) {
      return {
        shouldSimulateWatch: false,
        shouldViewComment: false
      }
    }

    console.log(`匹配到规则组: ${matchedRuleGroup.name}`)

    // 规则匹配成功，返回观看
    return {
      shouldSimulateWatch: Boolean(settings.simulateWatchBeforeComment),
      shouldViewComment: true,
      matchedRuleGroup
    }
  }

  // 随机点赞操作，按20%概率执行
  async _randomLike(): Promise<boolean> {
    try {
      // 按照20%的概率进行点赞操作
      const shouldLike = Math.random() < 0.2
      if (shouldLike) {
        console.log('随机触发点赞操作')
        await this._xhsElementHandler.like()
        // 点赞后随机等待1-3秒
        await sleep(random(1000, 3000))
        return true
      }
      return false
    } catch (error) {
      console.log('执行点赞操作时出错:', error)
      return false
    }
  }

  async _postComment(
    matchedRuleGroup?: FeedAcRuleGroups
  ): Promise<{ success: boolean; commentText?: string; reason?: string }> {
    try {
      // 从用户配置中获取随机评论内容
      const randomComment = this._getRandomComment(matchedRuleGroup)
      console.log(`随机选择评论内容: ${randomComment}`)

      // 查找评论输入框（根据小红书的实际DOM结构调整选择器）
      const inputSelector = '.content-input'
      console.log('查找评论输入框...')

      // 等待输入框出现并点击，设置5秒超时
      const inputElement = await this._page
        ?.waitForSelector(inputSelector, { timeout: 5000 })
        .catch(() => null)
      if (!inputElement) {
        console.log('未找到评论输入框')
        return { success: false, reason: '未找到评论输入框' }
      }

      await this.humanInput(inputElement, randomComment)

      // 随机等待1-3秒
      await sleep(random(1000, 3000))

      // 输入完成后稍微暂停一下，然后按回车键发送评论
      await sleep(random(500, 1000))
      console.log('按回车键发送评论')

      // 发送评论
      await this._page?.keyboard.press('Enter')

      // 延迟1秒
      await sleep(1000)
      await this._page?.waitForSelector('.not-active', { timeout: 5000 })
      .catch(() => {
        console.log('评论发送失败，未找到评论按钮')
        return { success: false, reason: '发布评论时失败' }
      })
      .then(() => {
        console.log('评论已发送成功')
      })

      return { success: true, commentText: randomComment }
    } catch (error) {
      console.log('发布评论时出错:', error)
      return { success: false, reason: String(error) }
    }
  }

  private async humanInput(inputElement: any, text: string) {
    await inputElement.click()
    console.log('成功点击评论输入框')

    // 等待一小段时间确保输入框已聚焦
    await sleep(1000)

    // 模拟人类输入行为，一个字符一个字符地输入，并在字符之间添加随机延迟
    console.log(`开始模拟人类输入评论: ${text}`)
    for (let i = 0; i < text.length; i++) {
      // 输入单个字符
      await this._page?.keyboard.type(text[i])

      // 添加随机延迟，模拟人类输入速度（100-300毫秒）
      await sleep(random(100, 300))

      // 随机在某些字符后暂停稍长时间（模拟思考）
      if (Math.random() < 0.1 && i < text.length - 1) {
        const pauseDelay = Math.floor(Math.random() * 500) + 300
        await sleep(pauseDelay)
      }
    }

    console.log(`完成模拟人类输入评论: ${text}`)
  }

  // 随机选择评论内容
  _getRandomComment(matchedRuleGroup?: FeedAcRuleGroups): string {
    // 优先从匹配的规则组中获取评论内容
    if (
      matchedRuleGroup &&
      matchedRuleGroup.commentTexts &&
      matchedRuleGroup.commentTexts.length > 0
    ) {
      const randomIndex = Math.floor(Math.random() * matchedRuleGroup.commentTexts.length)
      return matchedRuleGroup.commentTexts[randomIndex]
    }

    // 如果没有匹配的规则组或规则组没有配置评论内容，抛出错误
    throw new Error('未配置评论文案，请在规则组中配置评论内容')
  }

  /**
   * 记录内容跳过（未评论）
   */
  private _recordContentSkip(
    contentId: string,
    skipReason: string,
    contentInfo: any
  ): void {
    if (!this._taskId || !this._currentContentStartTime) return

    const videoRecord: VideoRecord = {
      videoId: contentId,
      authorName: contentInfo.author?.nickname || '未知',
      videoDesc: contentInfo.desc || '',
      videoTags: contentInfo.tags || [],
      shareUrl: '',
      watchDuration: Date.now() - this._currentContentStartTime,
      isCommented: false,
      skipReason,
      timestamp: Date.now()
    }

    taskHistoryService.addVideoRecord(this._taskId, videoRecord)
  }

  /**
   * 记录内容评论成功
   */
  private _recordContentComment(contentId: string, contentInfo: any, commentText: string): void {
    if (!this._taskId || !this._currentContentStartTime) return

    const videoRecord: VideoRecord = {
      videoId: contentId,
      authorName: contentInfo.author?.nickname || '未知',
      videoDesc: contentInfo.desc || '',
      videoTags: contentInfo.tags || [],
      shareUrl: '',
      watchDuration: Date.now() - this._currentContentStartTime,
      isCommented: true,
      commentText,
      timestamp: Date.now()
    }

    taskHistoryService.addVideoRecord(this._taskId, videoRecord)
  }

  private _setupVideoDataListener() {
    this._page?.on('response', async (response) => {
      const url = response.url()
      if (url.includes('https://edith.xiaohongshu.com/api/sns/web/v1/homefeed')) {
        console.log('捕获到HomeFeed接口请求')
        try {
          // 尝试解析JSON响应
          const responseBody = await response.json()
          const feedItems = responseBody.data.items as XHSFeedItem[]
          if (feedItems && Array.isArray(feedItems)) {
            console.log(`接收到${feedItems.length}条数据`)
            feedItems.forEach((item) => this._feedCache.enqueue(item))
            console.log(`视频数据缓存更新，当前缓存数量: ${this._feedCache.size()}`)
          }
        } catch (error) {
          console.log('解析HomeFeed接口响应时出错:', error)
        }
      }
      if (url.includes('https://edith.xiaohongshu.com/api/sns/web/v1/search/notes')) {
        console.log('捕获到搜索接口请求')
        try {
          // 尝试解析JSON响应
          const responseBody = await response.json()
          const feedItems = responseBody.data.items as XHSFeedItem[]
          if (feedItems && Array.isArray(feedItems)) {
            console.log(`接收到${feedItems.length}条数据`)
            feedItems.forEach((item) => this._feedCache.enqueue(item))
            console.log(`视频数据缓存更新，当前缓存数量: ${this._feedCache.size()}`)
          }
        } catch (error) {
          console.log('解析搜索接口响应时出错:', error)
        }
      }
    })
  }

  // 分多次滚动，模拟真实用户
  private async scroll(page, scrollDistance = 1000) {
    const steps = 5
    const stepSize = scrollDistance / steps;
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, stepSize);
      await page.waitForTimeout(200); // 等待200毫秒
    }
  }

  private async searchByConfig(settings: FeedAcSettingsV2){
    console.log('开始执行搜索操作')
    const searchElement = await this._page!.waitForSelector('#search-input')
    // const searchElement = await this._page?.$('[data-e2e="searchbar-input"]')
    if (searchElement) {
      await this.humanInput(searchElement, settings.searchWord)
      await this._page?.keyboard.press('Enter')
      console.log('已输入搜索词，正在搜索...')
      await this._page!.waitForSelector('.feeds-container')
      console.log('搜索完成')
      if (settings.searchSort && settings.searchSort != '综合排序') {
        await this._page!.getByText('筛选', { exact: true }).hover()
        await sleep(random(1000, 2000))
        await this._page!.getByText(settings.searchSort, { exact: true }).click()
      }
      if (settings.searchTimeRange && settings.searchTimeRange != '不限') {
        await this._page!.getByText('筛选', { exact: true }).hover()
        await sleep(random(1000, 2000))
        await this._page!.getByText(settings.searchTimeRange, { exact: true }).click()
      }
      await sleep(random(1000, 2000))
    } else {
      console.log('未找到搜索元素，跳过搜索')
    }
  }

}