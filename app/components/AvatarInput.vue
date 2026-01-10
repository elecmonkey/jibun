<script setup lang="ts">
type PresignResponse = {
  code: number
  data?: { url: string; fields: Record<string, string>; key: string }
  msg?: string
}

type ConfirmResponse = {
  code: number
  data?: { url: string }
  msg?: string
}

const props = defineProps<{
  modelValue: string
  label: string
  disabled?: boolean
  token: string
  manualLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const manualEnabled = ref(false)
const uploadError = ref('')
const uploading = ref(false)

const updateValue = (value: string) => emit('update:modelValue', value)

const handleUpload = async (files: File[] | File | null) => {
  if (!files) {
    return
  }
  const file = Array.isArray(files) ? files[0] : files
  if (!file) {
    return
  }
  uploadError.value = ''
  uploading.value = true
  try {
    const presign = await $fetch<PresignResponse>('/api/images/presign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${props.token}` },
      body: {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      },
    })
    if (presign.code !== 1 || !presign.data) {
      uploadError.value = presign.msg || '上传初始化失败'
      return
    }

    const formData = new FormData()
    Object.entries(presign.data.fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', file)
    const resp = await fetch(presign.data.url, { method: 'POST', body: formData })
    if (!resp.ok) {
      uploadError.value = '上传失败'
      return
    }

    const confirm = await $fetch<ConfirmResponse>('/api/images/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${props.token}` },
      body: { key: presign.data.key },
    })
    if (confirm.code !== 1 || !confirm.data?.url) {
      uploadError.value = confirm.msg || '确认失败'
      return
    }

    updateValue(confirm.data.url)
  } catch {
    uploadError.value = '上传失败'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <div class="mb-2 flex items-center justify-between">
      <div class="text-caption text-muted">{{ label }}</div>
      <v-switch
        v-model="manualEnabled"
        density="compact"
        hide-details
        :label="manualLabel || '手动填写 URL'"
        :disabled="disabled"
        class="text-xs"
      />
    </div>
    <div v-if="manualEnabled">
      <v-text-field
        :model-value="modelValue"
        label="图片 URL"
        variant="outlined"
        density="compact"
        :disabled="disabled"
        @update:model-value="updateValue"
      />
    </div>
    <div v-else>
      <div class="flex items-start gap-3">
        <v-file-input
          class="flex-1"
          label="上传图片"
          variant="outlined"
          density="compact"
          accept="image/*"
          :disabled="disabled || uploading"
          :loading="uploading"
          @update:model-value="handleUpload"
        />
        <div class="flex h-full items-start">
          <v-avatar size="40" class="shrink-0">
            <v-img v-if="modelValue" :src="modelValue" />
            <v-icon v-else icon="mdi-account" />
          </v-avatar>
        </div>
      </div>
      <v-alert v-if="uploadError" type="error" variant="tonal" class="mt-2">
        {{ uploadError }}
      </v-alert>
    </div>
  </div>
</template>
