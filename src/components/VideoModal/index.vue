<template>
    <a-modal
      wrapClassName="custom-modal-padding"
      :open="visible"
      :confirmLoading="confirmLoading"
      :okButtonProps="{ disabled: !(quality !== -1 && selected.length !== 0) }"
      :closable="false"
      :maskClosable="false"
      title="当前视频信息"
      okText="下载"
      cancelText="取消"
      centered
      :width="(videoInfo?.page && videoInfo?.page.length) > 40 ? 700 : 600"
      :cancelButtonProps="{disabled: confirmLoading}"
      @cancel="cancel"
      @ok="handleDownload">
      <a-spin :spinning="confirmLoading">
        <div class="video-modal custom-scroll-bar">
          <div class="video-info fr">
            <div class="image">
              <a-image :src="videoInfo.cover" />
            </div>
            <div class="content fc jsa pl16" :style="{width: (videoInfo?.page && videoInfo?.page.length) > 40 ? `460px` : `380px`}">
              <div class="text-active ellipsis-2" @click="openBrowser(videoInfo.url)">{{ videoInfo.title }}</div>
              <div class="ellipsis-1">up：<span v-for="(item, index) in videoInfo.up" :key="index" class="text-active mr8" @click="openBrowser(`https://space.bilibili.com/${item.mid}`)">{{item.name}}</span></div>
            </div>
          </div>
          <div class="mt16">
            选择清晰度：
            <div class="mt8" v-if="videoInfo.qualityOptions.length <= 0">
              <p class="err-msg">o(╥﹏╥)o 无法获取清晰度列表</p>
              <p class="err-msg" v-if="store.baseStore().loginStatus !== 2">
              当前账号为「<span style="font-weight: bold;">{{store.baseStore().loginStatus === 1 ? '普通用户' : '游客'}}</span>」,请确认该视频是否是会员视频
              </p>
            </div>
            <div class="mt8" v-else>
              <a-radio-group v-model:value="quality">
                <a-radio class="custom-radio" v-for="(item, index) in videoInfo.qualityOptions" :key="index" :value="item.value">
                  {{ item.label }}
                </a-radio>
              </a-radio-group>
            </div>
          </div>
          <template v-if="videoInfo.page && videoInfo.page.length > 1">
            <div class="fr ac jsb mt16">
              <div>选择视频</div>
              <div>
                <a-checkbox :checked="allSelected" @change="onAllSelectedChange">全选</a-checkbox>
                <a-checkbox v-model:checked="saveFilePrefix">保留[P?]</a-checkbox>
              </div>
            </div>
            <a-input v-model:value="keyword" class="mt8" placeholder="输入关键词，高亮匹配的视频" allow-clear />
            <div v-if="keyword.trim()" class="search-count">匹配 {{ matchCount }} 个视频</div>
            <a-tabs v-if="videoList.length > 1" v-model:activeKey="videoListActive">
              <a-tab-pane v-for="(group, index) in videoList" :key="`videoList-${index}`" :tab="keyword.trim() ? `${group.title} (${group.data.filter(item => matchesKeyword(item)).length})` : group.title">
                <VideoPageList :pages="group.data" :selected="selected" :current-page="currentPage" :keyword="keyword"
                  :is-vip="store.baseStore().loginStatus === 2" @toggle="toggle" />
              </a-tab-pane>
            </a-tabs>
            <VideoPageList v-else :pages="videoInfo.page" :selected="selected" :current-page="currentPage" :keyword="keyword"
              :is-vip="store.baseStore().loginStatus === 2" @toggle="toggle" />
          </template>
        </div>
      </a-spin>
    </a-modal>
</template>

<script lang="ts" setup>
import { computed, h, ref, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { store } from '../../store'
import { getDownloadList, addDownload } from '../../core/bilibili'
import { userQuality } from '../../assets/data/quality'
import { videoData } from '../../assets/data/default'
import { STATUS } from '../../assets/data/status'
import type { TaskData, VideoData, Page } from '../../type'
import VideoPageList from './VideoPageList.vue'
import { findCurrentPage, highlightParts } from './pageUtils'
import type { CheckboxChangeEvent } from 'ant-design-vue/es/checkbox/interface'

const visible = ref<boolean>(false)
const confirmLoading = ref<boolean>(false)
const quality = ref<number>(-1)
const videoInfo = ref<VideoData>(videoData)
const selected = ref<number[]>([])
const keyword = ref('')
const currentPage = computed(() => findCurrentPage(videoInfo.value)?.page ?? null)
const selectablePages = computed(() => videoInfo.value.page.filter(item => store.baseStore().loginStatus === 2 || item.badge !== '会员'))
const allSelected = computed(() => selectablePages.value.length > 0 && selectablePages.value.every(item => selected.value.includes(item.page)))
const matchesKeyword = (item: Page) => highlightParts(item.title || item.showTitle, keyword.value).some(part => part.match)
const matchCount = computed(() => videoInfo.value.page.filter(matchesKeyword).length)
const router = useRouter()
const saveFilePrefix = ref<boolean>(true)
const videoListActive = ref('videoList-0')

const videoList = computed(() => {
  if (!Array.isArray(videoInfo.value.page) || videoInfo.value.page.length <= 1) {
    return []
  }
  const res: { title: string, data: Page[] }[] = []
  const temp: Record<string, Page[]> = {}
  videoInfo.value.page.forEach(item => {
    const sectionsTitle = item.sectionsTitle || '正片'
    if (!Array.isArray(temp[sectionsTitle])) {
      temp[sectionsTitle] = []
    }
    temp[sectionsTitle].push(item)
  })
  for (const sectionsTitle in temp) {
    res.push({
      title: sectionsTitle,
      data: temp[sectionsTitle]
    })
  }

  return res
})

const cancel = () => {
  visible.value = false
  confirmLoading.value = false
  quality.value = -1
  selected.value = []
  keyword.value = ''
}

function showConfirm () {
  return new Promise((resolve) => {
    Modal.confirm({
      title: '温馨提示(*^▽^*)',
      content: () => {
        return h('div', [
          h('p', { style: { paddingTop: '20px' } }, '当前下载视频超过50个，强烈建议(除非必要)关闭“下载弹幕”，可提速30%'),
          h('p', { style: { color: '#ccc', fontSize: '12px', textAlign: 'right', marginBottom: 0 } }, '—————— 关闭“下载弹幕”在界面左下角头像下边')
        ])
      },
      icon: h('div'),
      okText: '继续下载',
      cancelText: '取消',
      onOk () {
        resolve(true)
      },
      onCancel () {
        resolve(false)
      }
    })
  })
}

const handleDownload = async () => {
  const downaldPathExist = await window.electron.checkDownaldPathExist()
  if (!downaldPathExist) {
    message.error('保存视频的文件夹不存在，请在“设置 → 下载地址”中选择一个有效路径')
    return
  }
  if (selected.value.length > 50) {
    if (store.settingStore().isDanmaku) {
      const isOk = await showConfirm()
      if (!isOk) return
    }
    message.warn('当前下载视频超过50个, 请耐心等待解析')
  }
  confirmLoading.value = true
  // 获取当前选中视频的下载数据
  const list = await getDownloadList(toRaw(videoInfo.value), toRaw(selected.value), quality.value, undefined, undefined, saveFilePrefix.value)
  const taskList = addDownload(list)
  store.taskStore().setTask(taskList)
  let count = 0
  let selectedTask = ''
  const _tempList: TaskData[] = []
  for (const key in taskList) {
    const task = taskList[key]
    if (task.status === STATUS.PLAN_START) {
      // window.electron.downloadVideo(task)
      _tempList.push(task)
      count += 1
      if (!selectedTask) selectedTask = task.id
    }
    // await sleep(300)
  }
  if (_tempList.length > 0) {
    window.electron.downloadVideoList(_tempList)
  }
  store.baseStore().addDownloadingTaskCount(count)
  confirmLoading.value = false
  visible.value = false
  store.taskStore().setRightTaskId(selectedTask)
  router.push({ name: 'download' })
}

const open = (data: VideoData) => {
  saveFilePrefix.value = true
  selected.value = []
  keyword.value = ''
  const quality = userQuality[store.baseStore().loginStatus]
  // 过滤掉 不合法的清晰度
  data.qualityOptions = data.qualityOptions.filter((item) => quality.includes(item.value))
  videoInfo.value = data
  visible.value = true
  const currentGroup = videoList.value.findIndex(group => group.data.some(item => item.page === currentPage.value))
  videoListActive.value = `videoList-${Math.max(currentGroup, 0)}`
  // 如果是单p，则默认选中
  if (videoInfo.value.page.length === 1) {
    selected.value.push(videoInfo.value.page[0].page)
  }
}

const onAllSelectedChange = (e: CheckboxChangeEvent) => {
  selected.value = e.target.checked ? selectablePages.value.map(item => item.page) : []
}

const toggle = (page: number) => {
  const index = selected.value.indexOf(page)
  if (index === -1) {
    selected.value.push(page)
  } else {
    selected.value.splice(index, 1)
  }
}

const openBrowser = (url: string) => {
  window.electron.openBrowser(url)
}

defineExpose({
  open
})

</script>

<style scoped lang="less">
.video-modal{
  min-height: 260px;
  max-height: 380px;
  overflow-y: overlay;
  padding-left: 12px;
  .video-info{
    height: 71.25px;
    .image{
      flex: none;
      width: 128px;
      min-width: 128px;
      overflow: hidden;
      position: relative;
      img{
        display: block;
        width: 100%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }
    .content{
      box-sizing: border-box;
      flex: none;
      width: 358px;
    }
  }
  .search-count {
    margin-top: 6px;
    color: #777;
    font-size: 12px;
  }
  .err-msg {
    text-align: center;
    color: @primary-color;
  }
}
.custom-radio{
  width: 150px;
}
</style>
