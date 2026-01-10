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

defineProps<{
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
const extensionType = ref('')
const extensionRaw = ref('')
const websiteTitle = ref('')
const websiteSite = ref('')
const extensionError = ref('')
const contentInput = ref<unknown>(null)

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

const getTextarea = () => {
  const root = contentInput.value as { $el?: HTMLElement } | null
  return root?.$el?.querySelector('textarea') ?? null
}

const applyWrap = (prefix: string, suffix: string, placeholder = '') => {
  const textarea = getTextarea()
  const value = momentContent.value
  if (!textarea) {
    momentContent.value = value + prefix + placeholder + suffix
    return
  }

  const start = textarea.selectionStart ?? value.length
  const end = textarea.selectionEnd ?? value.length
  const selected = value.slice(start, end) || placeholder
  const nextValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
  momentContent.value = nextValue

  nextTick(() => {
    const cursorStart = start + prefix.length
    const cursorEnd = cursorStart + selected.length
    textarea.focus()
    textarea.setSelectionRange(cursorStart, cursorEnd)
  })
}

const insertLinePrefix = (prefix: string) => {
  const textarea = getTextarea()
  const value = momentContent.value
  if (!textarea) {
    momentContent.value = value + `\n${prefix}`
    return
  }

  const start = textarea.selectionStart ?? value.length
  const end = textarea.selectionEnd ?? value.length
  const lines = value.slice(start, end || start).split('\n')
  const prefixed = lines.map((line) => (line ? `${prefix}${line}` : prefix)).join('\n')
  const nextValue = value.slice(0, start) + prefixed + value.slice(end)
  momentContent.value = nextValue

  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + prefix.length, start + prefixed.length)
  })
}

const getNormalizedExtension = () => {
  let error = ''
  const type = extensionType.value.trim()
  if (!type) {
    return { extension: '', extension_type: '', error }
  }
  if (type === 'WEBSITE') {
    const site = websiteSite.value.trim()
    if (!site) {
      if (websiteTitle.value.trim()) {
        error = '网站链接不能为空'
      }
      return { extension: '', extension_type: type, error }
    }
    const title = websiteTitle.value.trim() || '外部链接'
    return { extension: JSON.stringify({ title, site }), extension_type: type, error }
  }

  let value = extensionRaw.value.trim()
  if (!value) {
    return { extension: '', extension_type: type, error }
  }

  if (type === 'VIDEO') {
    const bvRegex = /(BV[0-9A-Za-z]{10})/
    const ytRegex =
      /(?:https?:\/\/(?:www\.)?)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed)\/))([\w-]+)/
    const bv = value.match(bvRegex)
    if (bv) {
      value = bv[1] ?? bv[0]
    } else {
      const yt = value.match(ytRegex)
      if (yt) {
        value = yt[1] ?? ''
      } else {
        error = '请输入正确的B站/YT链接或ID'
        return { extension: '', extension_type: type, error }
      }
    }
  }

  return { extension: value, extension_type: type, error }
}

const postMoment = async () => {
  const content = momentContent.value.trim()
  const { extension, extension_type, error } = getNormalizedExtension()
  extensionError.value = error
  if (extensionError.value) {
    return
  }
  if (!content && uploadedImageUrls.value.length === 0 && !extension) {
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
        body: {
          content,
          tags: momentTags.value,
          images: uploadedImageUrls.value,
          extension: extension || null,
          extension_type: extension_type || null,
        },
      },
    )
    if (resp.code === 1) {
      momentContent.value = ''
      momentTags.value = []
      extensionType.value = ''
      extensionRaw.value = ''
      websiteTitle.value = ''
      websiteSite.value = ''
      extensionError.value = ''
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
    <div class="mb-2 flex flex-wrap gap-2">
      <v-btn size="x-small" variant="text" class="h-8 w-8 min-w-0 rounded-md" @click="applyWrap('**', '**', '加粗文本')">
        <v-icon size="16" icon="mdi-format-bold" />
      </v-btn>
      <v-btn size="x-small" variant="text" class="h-8 w-8 min-w-0 rounded-md" @click="applyWrap('_', '_', '斜体文本')">
        <v-icon size="16" icon="mdi-format-italic" />
      </v-btn>
      <v-btn size="x-small" variant="text" class="h-8 w-8 min-w-0 rounded-md" @click="applyWrap('`', '`', '代码')">
        <v-icon size="16" icon="mdi-code-tags" />
      </v-btn>
      <v-btn size="x-small" variant="text" class="h-8 w-8 min-w-0 rounded-md" @click="applyWrap('[', '](url)', '链接文本')">
        <v-icon size="16" icon="mdi-link-variant" />
      </v-btn>
      <v-btn size="x-small" variant="text" class="h-8 w-8 min-w-0 rounded-md" @click="insertLinePrefix('> ')">
        <v-icon size="16" icon="mdi-format-quote-close" />
      </v-btn>
      <v-btn size="x-small" variant="text" class="h-8 w-8 min-w-0 rounded-md" @click="insertLinePrefix('- ')">
        <v-icon size="16" icon="mdi-format-list-bulleted" />
      </v-btn>
    </div>
    <v-textarea
      v-model="momentContent"
      ref="contentInput"
      label="此刻想到..."
      variant="outlined"
      density="compact"
      rows="3"
      auto-grow
      :disabled="disabled"
    />
    <v-file-input
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
      label="添加标签"
      variant="outlined"
      density="compact"
      chips
      multiple
      clearable
      :disabled="disabled"
    />
    <v-select
      v-model="extensionType"
      label="扩展内容"
      variant="outlined"
      density="compact"
      clearable
      :items="[
        { title: '音乐', value: 'MUSIC' },
        { title: '视频', value: 'VIDEO' },
        { title: 'GitHub 项目', value: 'GITHUBPROJ' },
        { title: '网站链接', value: 'WEBSITE' },
      ]"
      :disabled="disabled"
    />
    <div v-if="extensionType && extensionType !== 'WEBSITE'" class="mt-2">
      <v-text-field
        v-model="extensionRaw"
        :label="extensionType === 'MUSIC' ? '音乐链接' : extensionType === 'VIDEO' ? 'B站或YouTube链接/ID' : 'GitHub 仓库链接'"
        variant="outlined"
        density="compact"
        :disabled="disabled"
      />
    </div>
    <div v-if="extensionType === 'WEBSITE'" class="mt-2">
      <v-text-field
        v-model="websiteTitle"
        label="网站标题"
        variant="outlined"
        density="compact"
        :disabled="disabled"
      />
      <v-text-field
        v-model="websiteSite"
        class="mt-2"
        label="网站链接"
        variant="outlined"
        density="compact"
        :disabled="disabled"
      />
    </div>
    <div v-if="extensionError" class="mt-1 text-xs text-[rgba(var(--v-theme-on-surface),0.6)]">
      {{ extensionError }}
    </div>
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
