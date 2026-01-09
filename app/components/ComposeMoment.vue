<script setup lang="ts">
type UploadItem = {
  id: string
  file: File
  previewUrl: string
  key?: string
  url?: string
  uploading: boolean
  error?: string
}

const props = defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  (e: 'posted'): void
}>()

const { token } = useAuthToken()
const momentContent = ref('')
const momentTags = ref<string[]>([])
const momentUploads = ref<UploadItem[]>([])
const uploadMessage = ref('')
const posting = ref(false)

const MAX_IMAGE_COUNT = 9
const MAX_IMAGE_SIZE = 15 * 1024 * 1024

const uploadImageToS3 = async (item: UploadItem) => {
  item.uploading = true
  item.error = undefined
  try {
    if (!token.value) {
      throw new Error('unauthorized')
    }
    const presign = await $fetch<{ code: number; data?: { url: string; fields: Record<string, string>; key: string } }>(
      '/api/images/presign',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: {
          filename: item.file.name,
          contentType: item.file.type,
          size: item.file.size,
        },
      },
    )
    if (presign.code !== 1 || !presign.data) {
      throw new Error('presign failed')
    }
    item.key = presign.data.key
    const formData = new FormData()
    Object.entries(presign.data.fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', item.file)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(presign.data.url, { method: 'POST', body: formData, signal: controller.signal })
    clearTimeout(timer)
    if (!resp.ok) {
      throw new Error('upload failed')
    }
    const confirm = await $fetch<{ code: number; data?: { url: string } }>(
      '/api/images/confirm',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: {
          key: item.key,
        },
      },
    )
    if (confirm.code !== 1 || !confirm.data?.url) {
      throw new Error('confirm failed')
    }
    item.url = confirm.data.url
  } catch (error) {
    item.error = (error as Error).message || 'upload error'
    uploadMessage.value = item.error
  } finally {
    item.uploading = false
    momentUploads.value = [...momentUploads.value]
  }
}

const addImages = async (files: File[] | File | null) => {
  if (!files) {
    return
  }
  const list = Array.isArray(files) ? files : [files]
  uploadMessage.value = ''
  for (const file of list) {
    if (momentUploads.value.length >= MAX_IMAGE_COUNT) {
      uploadMessage.value = '最多只能上传 9 张图片'
      break
    }
    if (!file.type.startsWith('image/')) {
      uploadMessage.value = '仅支持图片文件'
      continue
    }
    if (file.size > MAX_IMAGE_SIZE) {
      uploadMessage.value = '单张图片最大 15MB'
      continue
    }
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const previewUrl = URL.createObjectURL(file)
    const item: UploadItem = {
      id,
      file,
      previewUrl,
      uploading: true,
    }
    momentUploads.value.push(item)
    uploadImageToS3(item)
  }
}

const removeUploadImage = (id: string) => {
  const index = momentUploads.value.findIndex((item) => item.id === id)
  if (index >= 0) {
    const [item] = momentUploads.value.splice(index, 1)
    if (item) {
      URL.revokeObjectURL(item.previewUrl)
    }
  }
}

const hasUploadingImages = computed(() => momentUploads.value.some((item) => item.uploading))
const uploadedImageUrls = computed(() =>
  momentUploads.value.map((item) => item.url).filter((item): item is string => Boolean(item)),
)

const postMoment = async () => {
  if (!momentContent.value.trim()) {
    return
  }
  if (hasUploadingImages.value) {
    uploadMessage.value = '图片上传中，请稍候'
    return
  }
  posting.value = true
  try {
    const resp = await $fetch<{ code: number }>(
      '/api/moments',
      {
        method: 'POST',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
        body: { content: momentContent.value.trim(), tags: momentTags.value, images: uploadedImageUrls.value },
      },
    )
    if (resp.code === 1) {
      momentContent.value = ''
      momentTags.value = []
      momentUploads.value.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      momentUploads.value = []
      emit('posted')
    }
  } finally {
    posting.value = false
  }
}
</script>

<template>
  <div class="rounded-sm border border-[rgba(var(--v-theme-on-surface),0.08)] bg-[rgba(var(--v-theme-surface),0.98)] p-4">
    <div class="mb-2 text-sm font-semibold text-[rgba(var(--v-theme-on-surface),0.85)]">
      写一条
    </div>
    <v-textarea
      v-model="momentContent"
      label="此刻想到..."
      variant="outlined"
      density="compact"
      rows="3"
      auto-grow
      :disabled="disabled"
    />
    <v-file-input
      class="mt-2"
      label="添加图片（最多 9 张）"
      variant="outlined"
      density="compact"
      prepend-icon="mdi-image-outline"
      accept="image/*"
      multiple
      :disabled="disabled"
      @update:model-value="addImages"
    />
    <div v-if="momentUploads.length" class="mt-2 flex flex-wrap gap-2">
      <div v-for="item in momentUploads" :key="item.id" class="relative h-16 w-16">
        <v-img :src="item.previewUrl" aspect-ratio="1" cover class="rounded-md border border-[rgba(var(--v-theme-on-surface),0.08)]" />
        <v-btn
          icon
          size="x-small"
          variant="tonal"
          class="absolute right-0 top-0 h-5 w-5 min-w-[20px] min-h-[20px] bg-[rgb(var(--v-theme-surface))]"
          @click="removeUploadImage(item.id)"
        >
          <v-icon size="12" icon="mdi-close" />
        </v-btn>
        <div
          v-if="item.uploading"
          class="absolute inset-0 flex items-center justify-center rounded-md bg-black/35"
        >
          <v-progress-circular indeterminate size="20" />
        </div>
      </div>
    </div>
    <div v-if="uploadMessage" class="mt-1 text-xs text-[rgba(var(--v-theme-on-surface),0.6)]">
      {{ uploadMessage }}
    </div>
    <v-combobox
      v-model="momentTags"
      class="mt-2"
      label="添加标签"
      variant="outlined"
      density="compact"
      chips
      multiple
      clearable
      :disabled="disabled"
    />
    <v-btn
      color="accent"
      block
      class="mt-3"
      :disabled="disabled || posting || hasUploadingImages"
      @click="postMoment"
    >
      发布
    </v-btn>
  </div>
</template>
