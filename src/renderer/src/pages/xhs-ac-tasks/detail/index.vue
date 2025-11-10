<template>
  <div class="p-6">
    <n-page-header @back="handleBack">
      <n-grid :cols="24" :x-gap="12">
        <n-gi :span="16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold">任务详情</h1>
            <n-tag :type="getStatusType(taskDetail?.status || 'running')" class="ml-4">
              {{ getStatusText(taskDetail?.status || 'running') }}
            </n-tag>
          </div>
          <div class="text-gray-500 mt-2">
            任务ID: {{ taskId }}
          </div>
        </n-gi>
        <n-gi :span="8" class="text-right">
          <n-button @click="loadTaskDetail" :disabled="loading">
            <template #icon>
              <n-icon>
                <RefreshOutline />
              </n-icon>
            </template>
            刷新
          </n-button>
        </n-gi>
      </n-grid>
    </n-page-header>

    <n-spin :show="loading">
      <div v-if="taskDetail" class="mt-6">
        <n-card title="任务概览" class="mb-6">
          <n-descriptions label-placement="left" bordered>
            <n-descriptions-item label="开始时间">
              {{ formatTime(taskDetail.startTime) }}
            </n-descriptions-item>
            <n-descriptions-item label="结束时间">
              {{ formatTime(taskDetail.endTime || undefined) }}
            </n-descriptions-item>
            <n-descriptions-item label="评论数量">
              {{ taskDetail.videoRecords.filter(r => r.isCommented).length }}
            </n-descriptions-item>
            <n-descriptions-item label="观看视频数">
              {{ taskDetail.videoRecords.length }}
            </n-descriptions-item>
          </n-descriptions>
        </n-card>

        <n-card title="视频记录">
          <n-data-table
            :columns="columns"
            :data="taskDetail.videoRecords"
            :pagination="pagination"
            :bordered="false"
          />
        </n-card>
      </div>

      <div v-else class="text-center py-12 text-gray-500">
        未找到任务详情
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  NPageHeader, 
  NGrid, 
  NGi, 
  NTag, 
  NButton, 
  NIcon, 
  NSpin, 
  NCard, 
  NDescriptions, 
  NDescriptionsItem,
  NDataTable,
  useMessage
} from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { TaskHistoryRecord, VideoRecord } from '@/shared/task-history'
import { useDetailStore } from './stores/detail'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const detailStore = useDetailStore()

const taskId = route.params.taskId as string
const taskDetail = ref<TaskHistoryRecord | null>(null)
const loading = ref(false)

const columns = [
  {
    title: '视频ID',
    key: 'videoId',
    width: 120,
    ellipsis: true
  },
  {
    title: '作者',
    key: 'authorName',
    width: 120
  },
  {
    title: '描述',
    key: 'videoDesc',
    ellipsis: true
  },
  {
    title: '观看时长',
    key: 'watchDuration',
    width: 100,
    render(row: VideoRecord) {
      return `${Math.round(row.watchDuration / 1000)}s`
    }
  },
  {
    title: '状态',
    key: 'isCommented',
    width: 100,
    render(row: VideoRecord) {
      return row.isCommented ? '已评论' : '未评论'
    }
  },
  {
    title: '评论内容',
    key: 'commentText',
    ellipsis: true
  },
  {
    title: '时间',
    key: 'timestamp',
    width: 160,
    render(row: VideoRecord) {
      return formatTime(row.timestamp)
    }
  }
]

const pagination = {
  pageSize: 10
}

onMounted(() => {
  loadTaskDetail()
})

const loadTaskDetail = async (): Promise<void> => {
  loading.value = true
  try {
    const detail = await window.api.getXHSTaskDetail(taskId)
    taskDetail.value = detail
  } catch (error) {
    message.error(`加载任务详情失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

const handleBack = (): void => {
  router.back()
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