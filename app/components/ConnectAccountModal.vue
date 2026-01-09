<script setup lang="ts">
type InboundItem = {
  serverName: string
  serverUrl: string
  sysUsername: string
  tokenHint: string | null
}

const props = defineProps<{
  modelValue: boolean
  inbound: InboundItem | null
  localServerUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'completed'): void
}>()

const email = ref('')
const password = ref('')
const displayName = ref('')
const avatarUrl = ref('')
const loading = ref(false)
const error = ref('')

const close = () => emit('update:modelValue', false)

const signPayload = async (secret: string, payload: string) => {
  const encoder = new TextEncoder()
  const key = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await window.crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type IssueAccountResponse = {
  code: number
  msg: string
  data?: { redirect?: string }
}

const submit = async () => {
  error.value = ''
  if (!props.inbound) {
    error.value = '缺少目标实例'
    return
  }
  if (!props.inbound.tokenHint) {
    error.value = '缺少签名密钥'
    return
  }
  if (!props.localServerUrl.trim()) {
    error.value = '请先配置站点地址'
    return
  }
  if (!email.value.trim() || !password.value.trim()) {
    error.value = '请填写邮箱和密码'
    return
  }
  if (!import.meta.client) {
    error.value = '仅支持浏览器端操作'
    return
  }

  loading.value = true
  try {
    const timestamp = Date.now()
    const payload = {
      server_url: props.localServerUrl.trim(),
      email: email.value.trim().toLowerCase(),
      password: password.value,
      display_name: displayName.value.trim() || null,
      avatar_url: avatarUrl.value.trim() || null,
    }
    const body = JSON.stringify(payload)
    const signaturePayload = `${timestamp}.${body}`
    const signature = await signPayload(props.inbound.tokenHint, signaturePayload)

    const baseUrl = props.inbound.serverUrl.replace(/\/+$/, '')
    const resp = (await $fetch(
      `${baseUrl}/api/connect/issue-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': String(timestamp),
          'X-Signature': signature,
        },
        body,
      },
    )) as IssueAccountResponse

    if (resp.code !== 1 || !resp.data?.redirect) {
      error.value = resp.msg || '申请失败'
      return
    }

    window.open(resp.data.redirect, '_blank', 'noopener,noreferrer')
    emit('completed')
    close()
  } catch (err) {
    error.value = '申请失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" @update:model-value="emit('update:modelValue', $event)">
    <v-card class="p-6" rounded="lg">
      <div class="mb-2 text-base font-semibold text-black/80">
        申请账号
      </div>
      <div v-if="inbound" class="mb-4 text-sm text-black/60">
        目标：{{ inbound.serverName }} · {{ inbound.sysUsername }}
      </div>
      <v-text-field v-model="email" label="邮箱" variant="outlined" density="comfortable" />
      <v-text-field v-model="password" label="设置密码" type="password" variant="outlined" density="comfortable" />
      <v-text-field v-model="displayName" label="显示名（可选）" variant="outlined" density="comfortable" />
      <v-text-field v-model="avatarUrl" label="头像 URL（可选）" variant="outlined" density="comfortable" />
      <v-alert v-if="error" type="error" variant="tonal" class="mt-3">
        {{ error }}
      </v-alert>
      <div class="mt-4 flex justify-end gap-2">
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn color="accent" variant="flat" :loading="loading" @click="submit">
          提交并登录
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
