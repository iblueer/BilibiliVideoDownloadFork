<template>
  <a-modal
    wrapClassName="custom-modal-padding"
    :open="visible"
    :closable="false"
    :maskClosable="false"
    title="请登录Bilibili"
    okText="确认登录"
    :okButtonProps="{ disabled: !IPTSESSDATA, style: { display: activeTab === 1 ? 'none' : undefined } }"
    cancelText="不登录"
    @cancel="notLogin"
    @ok="login(IPTSESSDATA)">
    <a-tabs v-model:activeKey="activeTab" centered>
      <a-tab-pane :key="1" tab="扫码登录" force-render>
        <div class="login-box">
          <div class="qr-modal" v-if="!countDown && !isQrLoad">
            <SyncOutlined class="refresh" @click="refreshQrcode" />
          </div>
          <div class="qr-modal" v-if="isQrLoad" >
            <LoadingOutlined class="loading" />
          </div>
          <img v-if="imageBase64" :src="imageBase64" alt="" />
        </div>
        <div class="scan-status">{{ scanStatus === 1 ? '已扫码，请在手机上确认' : '请使用哔哩哔哩客户端扫码' }}</div>
      </a-tab-pane>
      <a-tab-pane :key="2" tab="手动输入">
        <div class="login-box">
          <a-input v-model:value="IPTSESSDATA" placeholder="输入你的SESSDATA">
            <template #suffix>
              <a-tooltip>
                <template #title>
                  <a @click="openBrowser('https://github.com/blogwy/BilibiliVideoDownload/wiki/%E8%8E%B7%E5%8F%96SESSDATA')">点击此处</a>查看如何获取SESSDATA
                </template>
                <InfoCircleOutlined style="color: rgba(0, 0, 0, 0.45)" />
              </a-tooltip>
            </template>
          </a-input>
        </div>
      </a-tab-pane>
    </a-tabs>
    <div class="mt16 desc">注：软件登录后只会获取你的SESSDATA来用做下载，账号是普通账号下载1080P视频，大会员可以下载8K视频，不登录下载480P视频</div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined, SyncOutlined, LoadingOutlined } from '@ant-design/icons-vue'
import qrCode from 'qrcode'
import { checkLogin } from '../../core/bilibili'
import { store } from '../../store'

const visible = ref<boolean>(false)
// 0 未扫码 1 已扫码
const scanStatus = ref<number>(0)
const activeTab = ref<number>(1)
const IPTSESSDATA = ref<string>('')
const imageBase64 = ref<string>('')
const oauthKey = ref<string>('')
const countDown = ref<number>(180)
const isCheck = ref<boolean>(true)
const isQrLoad = ref(false)
let timer: number | null = null
let checkStatusTimer: number | null = null

const open = async () => {
  visible.value = true
  scanStatus.value = 0
  isCheck.value = true
  await createQrcode()
  if (isCheck.value && visible.value) checkScanStatus(oauthKey.value)
}

const refreshQrcode = async () => {
  isCheck.value = false
  if (typeof checkStatusTimer === 'number') clearTimeout(checkStatusTimer)
  scanStatus.value = 0
  await createQrcode()
  if (!visible.value) return
  isCheck.value = true
  checkScanStatus(oauthKey.value)
}

const notLogin = () => {
  store.baseStore().setAllowLogin(false)
  hide()
}

const login = async (SESSDATA: string) => {
  if (!SESSDATA) {
    message.error('请输入SESSDATA')
    return
  }
  // 储存SESSDATA
  store.settingStore().setSESSDATA(SESSDATA)
  // 验证SESSDATA
  const { status, face, mid } = await checkLogin(store.settingStore().SESSDATA)
  // 储存LoginStatus
  store.baseStore().setLoginStatus(status)
  store.settingStore().setFace(face)
  store.settingStore().setDedeUserID(mid)
  hide()
}

const hide = () => {
  isCheck.value = false
  if (typeof timer === 'number') clearInterval(timer)
  timer = null
  if (typeof checkStatusTimer === 'number') clearTimeout(checkStatusTimer)
  visible.value = false
}

const openBrowser = (url: string):void => {
  window.electron.openBrowser(url)
}

const generateQRcodeAPI = 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate'
const createQrcode = async () => {
  isQrLoad.value = true
  const { body } = await window.electron.got(generateQRcodeAPI, {
    responseType: 'json'
  })

  const qrcode = await qrCode.toDataURL(body.data.url, {
    margin: 0,
    errorCorrectionLevel: 'H',
    width: 400
  })
  imageBase64.value = qrcode
  isQrLoad.value = false
  oauthKey.value = body.data.qrcode_key || ''
  // 开始倒计时
  countDown.value = 180
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  timer = window.setInterval(() => {
    if (!countDown.value) {
      if (typeof timer === 'number') clearInterval(timer)
      return
    }
    countDown.value -= 1
  }, 1000)
}
const QRCodeAPI = 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll'
const checkScanStatus = (key: string) => {
  run(key)
  async function run (key: string) {
    if (!isCheck.value) return
    const result = await window.electron.got(QRCodeAPI, {
      method: 'GET',
      responseType: 'json',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      searchParams: {
        qrcode_key: key
      }
    }).catch((e: unknown) => {
      console.log(e)
      return null
    })
    if (!isCheck.value || !visible.value || key !== oauthKey.value) return
    if (!result) {
      checkStatusTimer = window.setTimeout(() => run(key), 3000)
      return
    }
    const { body, headers: resHeader } = result
    const defaultData = {
      code: -999999
    }
    const {
      data = defaultData
    } = body
    console.log(data)
    // 非扫码登录成功
    if (data.code !== 0) {
      //  86101：未扫码
      if (data.code === 86101) {
        scanStatus.value = 0
      }
      // 86090：二维码已扫码未确认
      if (data.code === 86090) {
        scanStatus.value = 1
      }
      if (visible.value) {
        checkStatusTimer = window.setTimeout(() => {
          run(key)
        }, 3000)
      }

      // 0：扫码登录成功
      // 86038：二维码已失效
      // 86090：二维码已扫码未确认
      // 86101：未扫码
      return
    }
    // 获取SESSDATA
    const urlSESSDATA = body.data.url?.match(/[?&]SESSDATA=([^&]+)/)?.[1]
    const setCookieList = resHeader['set-cookie']
    const cookieSESSDATA = Array.isArray(setCookieList)
      ? setCookieList.find((str: string) => /^SESSDATA=/.test(str))?.match(/^SESSDATA=([^;]+)/)?.[1]
      : undefined
    const SESSDATA = urlSESSDATA || cookieSESSDATA
    isCheck.value = false
    if (!SESSDATA) {
      message.error('扫码成功，但未获取到 SESSDATA，请重试')
      return
    }
    await login(SESSDATA)
  }
}

defineExpose({
  open
})
</script>

<style scoped lang="less">
.scan-status {
  margin-top: 12px;
  text-align: center;
}
.login-box{
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  .qr-modal{
    width: 200px;
    height: 200px;
    position: absolute;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(190, 190, 190, 0.8);
    z-index: 10;
    .refresh{
      // position: absolute;
      // top: 50%;
      // left: 50%;
      // transform: translate(-50%, -50%);
      z-index: 11;
      font-size: 24px;
      color: @primary-color;
    }
    .loading {
      z-index: 11;
      font-size: 24px;
      color: @primary-color;
    }
  }
  img{
    width: 200px;
    height: 200px;
  }
}
</style>
